/* eslint-disable */
'use strict';

/**
 * Handlebars comparison helper
 * @param  {Mixed} lvalue   left value to compare
 * @param  {String} operator Operator
 * @param  {Mixed} rvalue   right value to compare
 * @param  {Object} options  options
 * @return {Boolean}          comparison result
 */
module.exports = function compare(lvalue, operator, rvalue, options) {
    var operators, result;

    if (arguments.length < 3) {
        throw new Error(`Handlerbars Helper 'compare' needs 2 parameters`);
    }

    if (options === undefined) {
        options = rvalue;
        rvalue = operator;
        operator = '===';
    }

    operators = {
        '==': function(l, r) { return l == r; },
        '===': function(l, r) { return l === r; },
        '!=': function(l, r) { return l != r; },
        '!==': function(l, r) { return l !== r; },
        '<': function(l, r) { return l < r; },
        '>': function(l, r) { return l > r; },
        '<=': function(l, r) { return l <= r; },
        '>=': function(l, r) { return l >= r; },
        'typeof': function(l, r) { return typeof l == r; },
    };

    if (!operators[operator]) {
        throw new Error(`Handlerbars Helper 'compare' doesn't know the operator ` + operator);
    }

    result = operators[operator](lvalue, rvalue);

    if (result) {
        return options.fn(this);
    } else {
        if (typeof options.inverse === 'function') {
            return options.inverse(this);
        } else {
            return null;
        }
    }
};
