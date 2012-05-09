
// builtin
var fs = require('fs');
var path = require('path');

// local
var hash = require('./hash');
var manglers = require('./manglers');

function file(encoding) {
    encoding = encoding || 'binary';
    return function(filename) {
        return fs.readFileSync(filename, encoding);
    };
}

module.exports.file = file;

function uglifyjs(opt) {
    var mangler = manglers.uglifyjs(opt);
    return function(filename) {
        return mangler(file('utf8')(filename));
    };
}

module.exports.uglifyjs = uglifyjs;

function script(opt) {
    var script = require('script');

    opt = opt || {};

    return function(filename) {
        var module_name = path.basename(filename, '.js');

        return script.bundle({
            src: filename,
            name: module_name,
            auto_load: true,
            external: opt.external,
            shim: opt.shim,
        }).toString();
    };
}

module.exports.script = script;

function stylus(opt) {
    var stylus = require('stylus');

    opt = opt || {};

    var compress = opt.compress;
    var warn = !compress;
    var pubdir = opt.srcdir;
    var url_fn = opt.url_fn;

    return function(filename) {
        var stylus_file = filename.replace('.css', '.styl');

        if (!path.existsSync(stylus_file)) {
            return file('utf8')(filename);
        };

        var content = file('utf8')(stylus_file);

        var options = {
            src: pubdir || path.dirname(stylus_file),
            warn: warn,
            filename: stylus_file,
            compress: compress,
        }

        var styl = stylus(content, options)
            .set('filename', options.filename)
            .set('warn', options.warn)
            .set('compress', options.compress);

        if (url_fn) {
            styl.define('url', url_fn)
        }

        styl.render(function(err, css, js) {
            if (err) {
                throw err;
            }
            content = css;
        });

        return content;
    };
}

module.exports.stylus = stylus;

function cat() {
    var args = Array.prototype.slice.apply(arguments);

    return function() {
        var out = '';
        var file_loader = file('utf8');
        args.forEach(function(filename) {
            out += file_loader(filename);
        });

        return out;
    };
}

module.exports.cat = cat;

