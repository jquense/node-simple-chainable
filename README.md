node-simple-chainable
=====================

A small node module for queuing a series of functions one after another. Simple chainable allows you to queue up a
bunch of functions (including nested chains!) and run each queued item after each finishes. It also works great as the
building block for any fluent (chainable) object

Simple chain works very similiar to @substack's [chainsaw](https://github.com/substack/node-chainsaw) module, but with
a simpler implementation (for good or for bad). One of the major differences is that simple-chainable is merely and
implementation of a chain queue and not specifically built for fluent interfaces (although i use it for that).
It doesn't create an new chainable object for nested chains which means you can use `this` consistently for objects
that inherit simple-chain.


### Install

    npm install simple-chainable

### Options

simple-chain takes one option to its constructor: `autoStart -> bool` which will attempt to start the chain rolling when the
first item has been added to the queue.

    new SimpleChainable(true) //autoStart true

Auto start uses `process.nextTick` to ensure that all items are initially chained before it starts the queue (otherwise
 it would end before it started!).

### Queuing functions

you can queue functions through the `.add(item -> func)` method and call the next item in the chain via `.next`. Generally you will
want to call `next()` in each `add()` call.

    var SimpleChain = require('simple-chainable')
      , chainable = new SimpleChain()
      , state = {};

    // Add an item to the queue
    chainable.add(function(){
        state.number = 5;
        chainable.next()
    })

    chainable.add(function(){
        state.number = state.number + 5;
        chainable.next()
    })

    chainable.add(function(){
        console.log(state.number); // => 10
    })

    console.log(state.number) // => undefined
    chainable.next() // start chain

#### Nested Chains

You can also create nested chains through the `.nest(cb -> func)`.

    chainable.add(function(){
        state.number = 5
        chainable.next()
    })

    chainable.nest(function(){
        //no need to call .next() here

        if ( state.number === 5){
            chainable.add(function(){
                state.number = 10
            })
        }
    })

    chainable.next() // start chain

    chainable.add(function(){
        console.log(state.number); // => 10
    })


### Fluent Interfaces

The most useful application of simple-chainable is in creating fluent, or chainable interfaces.

#### Create our chainable object

    var SimpleChainable = require('./simple-chainable')
      , Chainer = function(chainable){
            this.chainable = chainable;
            this.state = {}
        }

    Chainer.prototype.set = function(key, value){
        var self = this;

        this.chainable.add(function(){
            self.state[key] = value
            self.chainable.next()
        });
        return this
    }
    Chainer.prototype.multiple = function(key, a, b){
        var self = this;

        this.chainable.add(function(){
            self.state[key] = a * b
            self.chainable.next()
        });
        return this
    }

    Chainer.prototype.tap = function(cb){
        var self = this;
        self.chainable.nest(function(){
            cb.call(self, self.state)
        });
        return this
    }

Now we can use our chainable object and see how it works

    var chainable = new SimpleChainable()
      , chainer = new Chainer(chainable)


    chainer
        .set('number', 5)
        .set('multiplier', 2)
        .tap(function(state){
            chainer
                .multiply('result', state.number, state.multiplier)
                .tap(function(state){
                    console.log(state.result) // => 10
                })
        })
