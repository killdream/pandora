/// pandora.js --- Module packing and unpacking on steroids
//
// Copyright (c) 2012 Quildreen Motta
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation files
// (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge,
// publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/// Module pandora
//
// Pandora is a module abstraction library, that brings combinators for
// handling first-class modules in JavaScript. Modules are treated as
// simple native objects, which can already be handled through the
// object services provided by the JavaScript language itself.
//
// Pandora extends these core services with a series of pure monadic
// combinators, which brings a declarative-ish syntax for module
// definition and formal contracts a module expects to be met.
//
// There is no need for providing a CommonJS module service under
// Pandora, since the library works directly on objects. On environments
// that support CommonJS modules, however, users can leverage better
// modularisation and a rather more declarative syntax.


//// -- Aliases --------------------------------------------------------
var inherit = Object.create
var proto   = Object.getPrototypeOf
var keys    = Object.keys

var slice   = [].slice.call.bind([].slice)
var clone   = with_mappings



//// -- Core interface -------------------------------------------------
function pandora(service) {
  return Pandora.make(service) }


function merge() {
  var boxed     = slice(arguments)
  var required  = []
  var overrides = {}
  var result    = boxed.reduce( function(result, module) {
                                  copy_keys(module, result, overrides)
                                  required.push.apply(required, module._required)
                                  return result }
                              , { } )

  return !satisfied_p(result, required)?  raise(PandoraNotSatisfiedE(required))
  :      /* otherwise */                  result }


//// -- Helpers --------------------------------------------------------
function satisfied_p(object, names) {
  return names.every(function(key) {
                       return key in object }) }


function copy_keys(origin, target, overrides) {
  var module = origin._value
  keys(module).forEach(function(key) {
                         !(key in target)?   target[key] = module[key]
                         : override_p(key)?  target[key] = module[key]
                         : !overrides[key]?  raise(PandoraCollisionE(key))
                         : /* otherwise */   null // already overriden

                         overrides[key] = overrides[key] || origin._overrides[key] })

  return target

  function override_p(key) {
    if (origin._overrides[key] && overrides[key])  throw PandoraOverrideCollisionE(key)
    return origin._overrides[key] }}


function identity(x) {
  return x }


function callable_p(subject) {
  return typeof subject == 'function' }


function with_properties(origin, names, mapping) {
  mapping = mapping || identity
  return names.reduce( function(result, key) {
                         result[mapping(key)] = origin[key]
                         return result }
                     , {} )}


function with_mappings(origin, mapping) {
  return with_properties(origin, keys(origin), mapping) }



//// -- Core combinators -----------------------------------------------
var Pandora = {
  make:
  function _make(object) {
    var instance = inherit(this)

    instance._value     = clone(object || {})
    instance._required  = []
    instance._overrides = {}

    return instance }


, value:
  function _value() {
    return merge(this) }


, only:
  function _only() {
    this._value = with_properties(this._value, slice(arguments))
    return this }


, hiding:
  function _hiding() {
    var names = slice(arguments)
    names = keys(this._value).filter(function(key) {
                                       return !~names.indexOf(key) })
    this._value = with_properties(this._value, names)
    return this }


, prefix:
  function _prefix(name) {
    this._value = with_mappings( this._value
                               , function(key){ return name + key })
    return this }


, aliasing:
  function _aliasing(map) {
    var mapping = callable_p(map)?  map
                : /* otherwise */   function(key) {
                                      return key in map?      map[key]
                                      :      /* otherwise */  key }

    this._value = with_mappings(this._value, mapping)
    return this }


, map:
  function _map(mapping) {
    var value = this._value
    this._value = keys(value).reduce( function(result, key) {
                                        result[key] = mapping(value[key], key, value)
                                        return result }
                                    , {} )
    return this }


, require:
  function _require() {
    this._required.push.apply(this._required, arguments)
    return this }


, override:
  function _override() {
    slice(arguments).forEach( function(key) {
                                this._overrides[key] = true }
                            , this )
    return this }
}


//// -- Error handling -------------------------------------------------
function PandoraNotSatisfiedE(required) {
  var message = 'The following module\'s requirements haven\'t been met:\n  - '
              + required.join('\n  - ')
  var error   = Error.call(inherit(Error.prototype), message)
  error.name = 'PandoraNotSatisfiedE'
  return error }


function PandoraCollisionE(key) {
  var error = Error.call( inherit(Error.prototype)
                        , 'The key "' + key + '" already exists in the target module.')
  error.name = 'PandoraCollisionE'
  return error }


function PandoraOverrideCollisionE(key) {
  var error = Error.call( inherit(Error.prototype)
                        , 'The key "' + key + '" is already overriden by another module.')
  error.name = 'PandoraOverrideCollisionE'
  return error }


function raise(error) { throw error }


//// -- Exports --------------------------------------------------------
module.exports = { pandora : pandora
                 , merge   : merge
                 , Pandora : Pandora

                 , internal: { identity                  : identity
                             , callable_p                : callable_p
                             , satisfied_p               : satisfied_p
                             , with_properties           : with_properties
                             , with_mappings             : with_mappings
                             , copy_keys                 : copy_keys

                             , raise                     : raise
                             , PandoraNotSatisfiedE      : PandoraNotSatisfiedE
                             , PandoraCollisionE         : PandoraCollisionE
                             , PandoraOverrideCollisionE : PandoraOverrideCollisionE }}