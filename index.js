// builtin
var path = require('path');
var fs = require('fs');

// 3rd party
var mime = require('mime');

// hash functions
var hash = require('./lib/hash');

// file loaders
var loaders = require('./lib/loaders');

// synchronously Fingerprint the given path
function Fingerprint (opt) {
    var self = this;

    self.options = opt || {};

    self.hash_fn = opt.hash || hash.md5_short;

    // list of mime types we support
    self.supported = {};

    // route name to cached content
    self._cached = {};

    // route names to full filenames
    self.routes = {};
}

Fingerprint.prototype.register = function(ext, loader) {
    var self = this;
    var mime_type = mime.lookup(ext);
    self.supported[mime_type] = loader;
}

/// store some content for the given 'route'
Fingerprint.prototype.store = function(route, content) {
    var self = this;
    self._cached[route] = {
        mime: mime.lookup(route),
        content: content,
    };
}

Fingerprint.prototype.hash = function(route) {
    var self = this;

    var cached = self._cached[route];
    if (!cached) {
        cached = self.load(route);
    }

    if (cached.hash) {
        return cached.hash;
    }

    // at this point we could cache the hash
    var hash = self.hash_fn(cached.content);

    if (self.options.cache) {
        cached.hash = hash;
    }

    return hash;
}

Fingerprint.prototype.exists = function(route) {
    var self = this;
    return self.routes[route] !== undefined || self._cached[route] !== undefined;
}

Fingerprint.prototype.load = function(route) {
    var self = this;

    var cached = self._cached[route];
    if (cached) {
        return cached;
    }

    var filename = self.routes[route];
    if (!filename) {
        throw new Error('no such route: ' + route);
    }

    var mime_type = mime.lookup(filename);

    // do we have a loader function registered
    var lookup_fn = self.supported[mime_type];
    if (!lookup_fn) {
        lookup_fn = loaders.file('binary');
    }

    var result = {
        mime: mime_type,
        content: lookup_fn(filename),
    }

    if (self.options.cache) {
        self._cached[route] = result;
    }

    return result;
}

Fingerprint.prototype.route = function(route, filename) {
    var self = this;
    self.routes[route] = filename;
}

// request will be of the form /js/require.js, etc
// the pubdir path is not a part of this and we need to exclude it...
Fingerprint.prototype.middleware = function(opt) {
    var self = this;
    var max_age = opt.max_age || 0;

    return function(req, res, next) {

        var route = req.url;

        if (!self.exists(route)) {
            return next();
        }

        var details = self.load(route);

        if (!details.hash) {
            details.hash = self.hash(route);
        }

        res.header('ETag', details.hash);
        res.header('Date', new Date().toUTCString());
        res.header('Cache-Control', 'public, max-age=' + (max_age / 1000));
        res.header('Content-Type', details.mime + '; charset=utf8');
        res.header('Vary', 'Accept-Encoding');

        res.send(details.content);
    };
}

Fingerprint.hash = hash;
Fingerprint.loaders = loaders;

module.exports = Fingerprint;
