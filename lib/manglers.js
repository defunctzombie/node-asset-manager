

/// concatenates all of the arguments
module.exports.cat = function() {
    return Array.prototype.join.apply(arguments, ';\n');
}

module.exports.uglifyjs = function(opt) {
    var uglifyjs = require('uglify-js');

    return function (content) {
        var uglify = uglifyjs.uglify;
        var ast = uglifyjs.parser.parse(content);
        ast = uglify.ast_mangle(ast);
        ast = uglify.ast_squeeze(ast);
        return uglify.gen_code(ast);
    }
}

