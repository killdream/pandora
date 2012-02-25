var expect = typeof expect != undefined?  expect : require('expect.js')

expect.Assertion.prototype.raise = function(name) {
  expect(this.obj).to.be.a('function')
  var ex = {}

  try       { this.obj() }
  catch (e) { ex = e     }

  var fname = this.obj.name || 'fn'
  this.assert( ex.name === name
             , 'expected ' + fname + ' to throw ' + name
             , 'expected ' + fname + ' not to throw ' + name )}

expect.Assertion.prototype.hold = function(items) {
  this.assert( items.every(function(i){ return ~this.obj.indexOf(i) }, this)
             , 'expected [' + this.obj + '] to hold [' + items + ']'
             , 'expected [' + this.obj + '] not to hold [ ' + items + ']') }


describe('{} pandora', function() {
  var node_p     = typeof process != undefined && process.env
  var coverage_p = node_p && process.env.MOCHA_TEST_ENV
  var pandora    = coverage_p?      require('../src-cov/pandora')
                 : node_p?          require('../src/pandora')
                 : /* otherwise */  require('/pandora')

  var _       = pandora.pandora
  var $       = pandora.merge
  var proto   = Object.getPrototypeOf

  describe('λ pandora', function() {
    it('Should return a new Pandora wrapper for `object`.', function() {
      var m = _({ a: 1 })
      expect(proto(m)).to.be(pandora.Pandora)
      expect(m._value).to.eql({ a: 1 })
    })
  })

  describe('λ merge', function() {
    it('Should merge all Pandora wrappers into one module.', function() {
      var m = $(_({ a: 1 }), _({ b: 2 }), _({ c: 3 }), _({ d: 4 }))
      expect(m).to.eql({ a: 1, b: 2, c: 3, d: 4 })
    })
    it('Shouldn\'t allow more than one override per key.', function() {
      var a = _({ a: 1 }).override('a')
      var b = _({ a: 2 }).override('a')
      var c = _({ a: 3 })

      expect(function(){ $(a, b) }).to.raise('PandoraOverrideCollisionE')
      expect(function(){ $(a, c) }).to.not.throwException()
      expect(function(){ $(b, c) }).to.not.throwException()
    })
    it('Should choose overrides as the final value.', function() {
      var a = _({ a: 1 }).override('a')
      var b = _({ a: 2 }).override('a')
      var c = _({ a: 3 })

      expect($(c)).to.eql({ a: 3 })
      expect($(a, c)).to.eql({ a: 1 })
      expect($(b, c)).to.eql({ a: 2 })
    })
    it('Shouldn\'t allow duplicate keys.', function() {
      var a = _({ a: 1 })
      var b = _({ b: 2 })
      var c = _({ a: 2 })

      expect(function(){ $(a, c) }).to.raise('PandoraCollisionE')
      expect(function(){ $(a, b) }).to.not.throwException()
    })
    it('Should error if any requirement isn\'t met.', function() {
      var a = _({ a: 1 }).require('b')
      var b = _({ b: 2 })
      var c = _({ c: 3 })

      expect(function(){ $(a, c) }).to.raise('PandoraNotSatisfiedE')
      expect(function(){ $(a, b) }).to.not.throwException()
    })
    it('Shouldn\'t mutate any of the wrappers.', function() {
      var a = _({ a: 1 })
      var b = _({ b: 2 })
      var c = _({ c: 3 })
      var m = $(a, b, c)

      expect(m).to.eql({ a: 1, b: 2, c: 3 })
      expect(m).to.not.be(a)
      expect(m).to.not.be(b)
      expect(m).to.not.be(c)
      expect(a._value).to.eql({ a: 1 })
      expect(b._value).to.eql({ b: 2 })
      expect(c._value).to.eql({ c: 3 })
    })
  })

  describe('{} Pandora', function() {
    describe('λ make', function() {
      it('Should return a Pandora wrapper.', function() {
        var m = pandora.Pandora.make({ a: 1 })
        expect(proto(m)).to.be(pandora.Pandora)
        expect(m._value).to.eql({ a: 1 })
      })
      it('Should wrap a flatten, shallow clone of `object`.', function() {
        var z = {a:1}
        z = Object.create(z, { b: { value: 2, enumerable: true }})
        var m = pandora.Pandora.make(z)
        expect(m._value).to.not.be(z)
        expect(proto(m._value)).to.be(Object.prototype)
        expect(m._value).to.only.have.key('b')
      })
    })

    describe('λ value', function() {
      it('Should resolve the module for this Pandora wrapper alone.', function() {
        expect(_({ a: 1 }).value()).to.eql({ a: 1 })
        expect(function(){ _({ a: 1 }).require('b').value() })
          .to.raise('PandoraNotSatisfiedE')
        expect(_({ a: 1 }).override('a').value()).to.eql({ a: 1 })
      })
    })

    describe('λ only', function() {
      it('Should keep only the given keys.', function() {
        var m = _({ a: 1, b: 2, c: 3 })
        expect(m.only('b', 'c').value()).to.only.have.keys('b', 'c')
      })
    })

    describe('λ hide', function() {
      it('Should keep all but the given keys.', function() {
        var m = _({ a: 1, b: 2, c: 3 })
        expect(m.hide('b').value()).to.only.have.keys('a', 'c')
      })
    })

    describe('λ prefix', function() {
      it('Should prefix all keys with the given name.', function() {
        var m = _({ a: 1, b: 2, c: 3 })
        expect(m.prefix('f').value()).to.only.have.keys('fa', 'fb', 'fc')
      })
    })

    describe('λ alias', function() {
      it('Fun a  => Should map target keys as the mapper function.', function() {
        var m = _({ a: 1, b: 2, c: 3 })
        expect(m.alias(function(k){ return k.toUpperCase() }).value())
          .to.only.have.keys('A', 'B', 'C')
      })
      it('{k->a} => Should map target keys as the dictionary.', function() {
        var m = _({ a: 1, b: 2, c: 3 })
        expect(m.alias({ a: 'd' }).value()).to.only.have.keys('b', 'c', 'd')
      })
    })

    describe('λ map', function() {
      it('Should map target values as the mapper function.', function() {
        var m = _({ a: 2, b: 3 })
        expect(m.map(function(x){ return x * x }).value()).to.eql({ a: 4, b: 9 })
      })
    })

    describe('λ require', function() {
      it('Should add all given keys as required.', function() {
        var m = _({ a: 1, b: 2 }).require('a', 'b', 'c')
        expect(m._required).to.eql(['a','b','c'])
        var z = m.require('a', 'd', 'e')
        expect(z._required).to.hold(['a', 'b', 'c', 'd', 'e'])
        expect(m._required).to.eql(['a','b','c'])
      })
    })

    describe('λ override', function() {
      it('Should add all given keys as overrides.', function() {
        var m = _({ a: 1, b: 2 }).override('a', 'b')
        expect(m._overrides).to.eql({ a: true, b: true })
        var z = m.override('a', 'c')
        expect(z._overrides).to.eql({ a: true, b: true, c: true })
        expect(m._overrides).to.eql({ a: true, b: true })
      })
    })
  })
})