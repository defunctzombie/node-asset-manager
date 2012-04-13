
// builtin
var fs = require('fs');
var path = require('path');

// local
var hash = require('./hash');

function file(encoding) {
    encoding = encoding || 'binary';
    return function(filename) {
        return fs.readFileSync(filename, encoding);
    }
}

module.exports.file = file;

function uglifyjs(opt) {
    var uglifyjs = require('uglify-js');

    opt = opt || {};
    var compress = opt.compress;

    return function(filename) {
        var content = file('utf8')(filename);

        // no need to minify in development
        if (!compress) {
            return content;
        }

        var uglify = uglifyjs.uglify;
        var ast = uglifyjs.parser.parse(content);
        ast = uglify.ast_mangle(ast);
        ast = uglify.ast_squeeze(ast);

        return uglify.gen_code(ast) = ';';
    }
}

module.exports.uglifyjs = uglifyjs;

function jsbundler(opt) {
    var jsbundler = require('jsbundler');
    var uglifyjs = require('uglify-js');

    opt = opt || {};
    var compress = opt.compress;

    return function(filename) {
        var module_name = path.basename(filename, '.js');

        var out = jsbundler.bundle({
            src: filename,
            name: module_name,
            auto_load: true,
        }).toString();

        // no need to minify in development
        if (!compress) {
            return out;
        }

        var uglify = uglifyjs.uglify;
        var ast = uglifyjs.parser.parse(out);
        ast = uglify.ast_mangle(ast);
        ast = uglify.ast_squeeze(ast);

        return uglify.gen_code(ast);
    }
}

module.exports.jsbundler = jsbundler;

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

