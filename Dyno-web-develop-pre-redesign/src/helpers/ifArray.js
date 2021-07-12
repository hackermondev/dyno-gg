'use strict';

exports.ifArray = function ifArray(item, options) {
	return (Array.isArray(item)) ? options.fn(this) : options.inverse(this);
};

exports.unlessArray = function unlessArray(item, options) {
	return (Array.isArray(item)) ? options.inverse(this) : options.fn(this);
};
