// builtin
var path = require('path');
var fs = require('fs');

// 3rd party
var mime = require('mime');

// hash functions
var hash = require('./lib/hash');

// file loaders
var loaders = require('./lib/loaders');

// file manipulators
var manglers = require('./lib/manglers');

// synchronously Asset the given path
function Asset (opt) {
    var self = this;

    self.options = opt || {};

    self.hash_fn = opt.hash || hash.md5_short;

    // list of mime types we support
    self.supported = {};

    // route names to full filenames
    self.routes = {};

    // post processing per extension
    self._post = {};
}

Asset.prototype.register = function(ext, loader) {
    var self = this;
    var mime_type = mime.lookup(ext);
    self.supported[mime_type] = loader;
}

Asset.prototype.hash = function(route) {
    var self = this;

    var cached = self.routes[route];

    if (cached.hash) {
        return cached.hash;
    }

    var content = cached.content;
    if (!content) {
        content = self.load(route).content;
    }

    var hash = self.hash_fn(content);

    // to cache or not to cache
    if (self.options.cache) {
        cached.hash = hash;
    }

    return hash;
}

Asset.prototype.exists = function(route) {
    var self = this;
    return self.routes[route] !== undefined;
}

Asset.prototype.load = function(route) {
    var self = this;

    var saved_route = self.routes[route];
    if (!saved_route) {
        throw new Error('no such route: ' + route);
    }

    var content = saved_route.content;
    if (!content) {
        content = saved_route.load();

        // run post processing
        var post = self._post[path.extname(route)];
        if (post) {
            post.forEach(function(fn) {
                content = fn(content);
            });
        }
    }

    var result = {
        mime: saved_route.mime,
        content: content,
    }

    if (self.options.cache) {
        saved_route.content = result.content;
    }

    return result;
}

Asset.prototype.route = function(route, arg) {
    var self = this;
    var loader;

    // don't try to require the same route again
    if (self.routes[route]) {
        return;
    }

    var mime_type = mime.lookup(route);

    if (typeof arg === 'function') {
        loader = arg;
    } else {
        var filename = arg;

        // do we have a loader function registered
        var lookup_fn = self.supported[mime_type];
        if (!lookup_fn) {
            lookup_fn = loaders.file('binary');
        }

        loader = function() {
            return lookup_fn(filename);
        }
    }

    self.routes[route] = {
        mime: mime_type,
        load: loader
    }
}

Asset.prototype.post = function(ext, fn) {
    var self = this;

    var post = self._post[ext];
    if (!post) {
        post = self._post[ext] = [];
    }

    post.push(fn);
}

// request will be of the form /js/require.js, etc
// the pubdir path is not a part of this and we need to exclude it...
Asset.prototype.middleware = function(opt) {
    var self = this;
    var max_age = opt.max_age || 0;
    var srcdir = opt.srcdir;

    return function(req, res, next) {

        // remove any query string parameters
        // these will break checking for the file on disk
        var route = req.url.replace(/[?].*/, '');

        if (!self.exists(route)) {
            // do we support this type of file?
            var mime_type = mime.lookup(route);
            var lookup_fn = self.supported[mime_type];
            if (!lookup_fn) {
                return next();
            }

            // if no source dir or doesn't exist, can't load
            if (!srcdir || !path.existsSync(path.join(srcdir, route))) {
                return next();
            }

            var filename = path.join(srcdir, route);

            // will allow route to be loaded
            self.route(route, filename);
        }

        var details = self.load(route);

        if (!details.hash) {
            details.hash = self.hash(route);
        }

        var charset = mime.charsets.lookup(details.mime);

        res.header('ETag', details.hash);
        res.header('Date', new Date().toUTCString());
        res.header('Cache-Control', 'public, max-age=' + (max_age / 1000));
        res.header('Content-Type', details.mime + (charset ? '; charset=' + charset : ''));
        res.header('Vary', 'Accept-Encoding');

        res.send(details.content);
    };
}

Asset.hash = hash;
Asset.loaders = loaders;
Asset.manglers = manglers;

module.exports = Asset;
