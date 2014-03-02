'use strict';
var emitter = require('events').EventEmitter
  , util = require("util");

function ChainItem(nest, cb, args){
    this.cb   = cb;
    this.args = args;
    this.nest = nest;  
}

function SimpleChain(autoStart){
    this.autoStart = !!autoStart
    this.queue     = []
    this._nest     = [];
}

util.inherits(SimpleChain, emitter)

function trigger(cb, ctx, args){
    var a1 = args[0], a2 = args[1], a3 = args[2];

    switch (args.length) {
        case 0:  cb.call(ctx); return;
        case 1:  cb.call(ctx, a1); return;
        case 2:  cb.call(ctx, a1, a2); return;
        case 3:  cb.call(ctx, a1, a2, a3); return;
        default: cb.apply(ctx, args); return;
    }
}

SimpleChain.prototype._error = function(err){
    this.emit('error', err)
}

SimpleChain.prototype.clearQueue = function(){
    this.queue = []
    this._nest = []
}

SimpleChain.prototype.next = function(){
    if ( this._nest.length){
        this.queue = this._nest.concat(this.queue) // add the nested chain to our queue
        this._nest = []
    }

    var item =  this.queue.shift();

    if ( !item ) return this.emit('empty')

    this._lastItem = item

    this.atFront = item.nest

    trigger(item.cb, this, item.args)
    //this.atFront = false
}

SimpleChain.prototype.addBack = function(){
    if ( this._lastItem ){
        this.queue.unshift(this._lastItem)
        this._lastItem = null
    }
}

SimpleChain.prototype.nest = function(fn /*, [ args ] */){
    var self = this
      , args = Array.prototype.slice.call(arguments, 1);

    function wrap(){
        trigger(fn, self, args)
        self.next()
    }

    this._add(true, wrap, args)
}


SimpleChain.prototype.add = function(fn /*, [ args ] */){
    this._add(false, fn, Array.prototype.slice.call(arguments, 1))
}

SimpleChain.prototype._add = function(nest, fn , args ){
    var q = this.atFront ? this._nest : this.queue;

    if ( !this.queue ) this.queue = []
    if ( !this._nest ) this.nest  = []

    q.push(new ChainItem(nest, fn, args ))

    if ( this.autoStart && this.queue.length === 1)
        process.nextTick(this.next.bind(this));
}

module.exports = SimpleChain