
// builtin
var crypto = require('crypto');

// the default hashing function
// 6 characters is "good enough" :)
module.exports.md5_short = function(content) {
    return module.exports.md5(content).slice(0, 6);
}

module.exports.md5 = function(content) {
    var md5sum = crypto.createHash('md5');
    return md5sum.update(content).digest('hex');
}

