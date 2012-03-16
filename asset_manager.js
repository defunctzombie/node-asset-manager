
var path = require('path');
var crypto = require('crypto');

var AssetManager = function() {
    var self = this;
    self._assets = {};
    // extensions and their loaders
    self._extensions = {};
};

AssetManager.prototype.register = function(ext, func) {
    var self = this;
    self._extensions[ext] = func;
};

AssetManager.prototype.asset = function(name, mime) {
    var self = this;
    var parts = [];

    var asset = {};
    asset.name = name;
    asset.mime = mime;

    // add piece of asset to be loaded later
    asset.append = function(filename, cb) {
        if (!cb) {
            var ext = path.extname(filename).slice(1);
            cb = self._extensions[ext];
        }

        if (!cb) {
            throw new Error('no loader function specified for: ' + filename);
        }

        parts.push({ path: filename, loader: cb });
        return asset;
    };

    // load the asset
    asset.load = function(cb, filter) {
        if (asset._cache) {
            return cb(null, asset._cache);
        }

        var asset_content = '';
        var cb = cb || function() {};

        // load all the parts and build up the asset
        var loaders = parts.concat(); // clone
        (function next(err, content) {
            if (err) {
                return cb(err);
            }

            if (content) {
                asset_content += content;
            }

            var part = loaders.shift();
            if (!part) {
                asset._cache = asset_content;
                return cb(null, asset_content);
            }

            part.loader(part.path, next);
        })();
    };

    self._assets[name] = asset;
    return asset;
};

AssetManager.prototype.load = function(name, cb) {
    var self = this;
    var asset = self._assets[name];
    if (!asset) {
        return cb(new Error('no such asset: ' + name));
    }

    // TODO cache
    asset.load(function(err, content) {
        cb(err, { mime_type: asset.mime, content: content });
    });
};

AssetManager.prototype.hash = function(name, cb) {
    var self = this;

    self.load(name, function(err, content) {
        if (err) {
            return cb(err);
        }

        var md5sum = crypto.createHash('md5');
        var hash = md5sum.update(content).digest('hex');
        cb(null, hash);
    });
};

AssetManager.prototype.hashSync = function(name) {
    var self = this;
    var asset = self._assets[name];
    if (!asset) {
        throw new Error('no such asset: ' + name);
    }

    var content = asset._cache;
    if (!content) {
        throw new Error('asset not loaded: ' + name);
    }

    var md5sum = crypto.createHash('md5');
    return md5sum.update(content).digest('hex');
};

AssetManager.prototype.contains = function(name) {
    var self = this;
    return self._assets[name] !== undefined;
};

module.exports = AssetManager;
