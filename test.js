var chai = require('chai')
  , sinon = require("sinon")
  , sinonChai = require("sinon-chai")
  , Chainable = require('./simple-chain')
  , Chainer = function(c){
        this.chainable = c;
        this.vars = {}
    }

chai.use(sinonChai);
chai.should();

Chainer.prototype.set = function(key, value){
    var self = this
      , vars = this.vars;
    this.chainable.add(function(){
        vars[key] = value;
        self.chainable.next();
    });
    return this
}
Chainer.prototype.tap = function(cb){
    var self = this;
    self.chainable.nest(function(){
        cb.call(self, self.vars)
    });
    return this
}

describe('when creating a chainable', function(){
    var chainer, chainable;

    beforeEach(function(){
        chainable = new Chainable(true);

        sinon.spy(chainable, 'add')
        sinon.spy(chainable, 'nest')

        chainer = new Chainer(chainable)

        sinon.spy(chainer, 'set')
        sinon.spy(chainer, 'tap')
    })

    it('should call the correct methods', function(done){
        chainer
            .set('key', 5)
            .tap(function(vars){
                vars.should.not.be.empty;
                done()
            });

        chainer.set.should.have.been.calledOnce
        chainer.tap.should.have.been.calledOnce

        chainable.add.should.have.been.calledOnce
        chainable.add.should.have.been.calledWith(sinon.match.func)

        chainable.nest.should.have.been.calledOnce
    })

    it('should set the correct values on the parent', function(done){
        chainer
            .set('key', 5)
            .tap(function(vars){
                vars.should.have.property('key').that.equals(5)
                done()
            });

        chainer.set.should.have.been.calledOnce
        chainer.tap.should.have.been.calledOnce
    })

    it('should emit an empty event when finished', function(done){
        chainer
            .set('key', 5)
            .tap(function(vars){
                chainer.set('key', 10);
            });

        chainable.on('empty', function(){
            chainer.vars.should.have.property('key').that.equals(10)
            done()
        })
    })

    describe('when an item is added back to the queue', function(){

        it('should be executed again immediately after', function(done){
            var addedBack
              , cb = sinon.spy(function (vars){
                if ( !addedBack ) {
                    addedBack = true;
                    chainable.addBack()
                }
            });

            chainer
                .tap(cb)
                .tap(function(){
                    cb.should.have.been.calledTwice
                    done()
                })
        })
    })

    describe('when the queue is cleared', function(){
        var afterClear;

        beforeEach(function(){
            afterClear = sinon.spy();
        })

        it('should stop the chain', function(done){
            chainer
                .set('key', 5)
                .tap(function(vars){
                    chainable.clearQueue()
                    chainable.queue.should.be.empty
                })
                .tap(afterClear);

            chainable.on('empty', function(){
                afterClear.should.not.have.been.called
                done()
            })
        })
    })

    describe('when the chain is nested', function(){

        it('should call the chain in the correct order', function(done){
            chainer
                .set('key', 0)
                .tap(function(){
                    chainer.vars.should.have.property('key').that.equals(0)

                    chainer
                        .set('key', 10)
                        .tap(function(){
                            chainer.vars.should.have.property('key').that.equals(10)
                            chainer.set('key', 20)
                        })
                        .tap(function(){
                            chainer.vars.should.have.property('key').that.equals(20)
                            chainer
                                .set('key', 30)
                                .tap(function(){
                                    chainer.vars.should.have.property('key').that.equals(30)
                                    chainer.set('key', 40)
                                })
                        })
                        .set('key', 50)
                })
                .set('key', 60)
                .tap(function(){
                    chainer.set.callCount.should.be.equal(7)
                    chainer.vars.should.have.property('key').that.equals(60)
                    done()
                })
        })

    })
})