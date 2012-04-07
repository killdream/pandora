require.define("/pandora.js", function (require, module, exports, __dirname, __filename) {
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
var clone   = from_mappings



//// -- Core interface -------------------------------------------------

///// Function pandora
// Returns a Pandora wrapper for an object.
//
// pandora :: Object -> Pandora
function pandora(service) {
  return Pandora.make(service) }


///// Function merge
// Merges a series of Pandora wrappers into a single, native JavaScript
// object.
//
// Since keys can't collide and overrides must be explicit (and
// exclusive), the order in which arguments are passed over to this
// function doesn't matter.
//
// All of the requirements defined by the given Pandora wrappers *must*
// be met, otherwise an error is thrown.
//
//
// :raise: PandoraNotSatisfiedE
//    If not all of the requirements for the given Pandora wrappers are
//    met.
//
// :raise: PandoraCollisionE
//    If more than one Pandora wrapper defines a given key, and neither
//    provides an override clause for that key.
//
// :raise: PandoraOverrideCollisionE
//    If more than one Pandora wrapper defines an override for a given
//    key.
//
//
// marge :: Pandora... -> Object
function merge() {
  var boxed     = slice(arguments)
  var required  = []
  var overrides = {}
  var result    = boxed.reduce( function(result, module) {
                                  copy_keys(module, result, overrides)
                                  required.push.apply(required, module._required)
                                  return result }
                              , {} )

  return !satisfied_p(result, required)?  raise(PandoraNotSatisfiedE(required))
  :      /* otherwise */                  result }



//// -- Helpers --------------------------------------------------------

///// Function satisfied_p
// Does the given `object' implement all of the required `names'?
//
// satisfied_p :: Object, [String] -> Bool
function satisfied_p(object, names) {
  return names.every(function(key) {
                       return key in object }) }


///// Function copy_keys
// Copies the keys from an `origin' Pandora wrapper to the `target'
// Object.
//
// If the origin Pandora wrapper defines a key that already exists in
// the target object, it must explicitly declare that it overrides such
// a key. It's an error to declare duplicate keys, or duplicate
// overrides.
//
//
// :raise: PandoraCollisionE
//    If the Pandora wrapper defines a key that already exists in the
//    `target' Object.
//
// :raise: PandoraOverrideCollisionE
//    If the Pandora wrapper defines an override that's already in
//    effect in the `target' object — that is, such a key is in the set
//    of overrides provided for this function.
//
//
// copy_keys! :: Pandora, target:Object*, { String -> Bool } -> target
function copy_keys(origin, target, overrides) {
  var module = origin._value
  keys(module).forEach(function(key) {
                         !(key in target)?   target[key] = module[key]
                         : override_p(key)?  target[key] = module[key]
                         : !overrides[key]?  raise(PandoraCollisionE(key))
                         : /* otherwise */   null // already overriden

                         overrides[key] = overrides[key] || origin._overrides[key] })

  return target

  ////// Function override_p
  // Checks if the origin defines an override for a given `key'.
  //
  // override_p :: String -> Bool
  function override_p(key) {
    if (origin._overrides[key] && overrides[key])  throw PandoraOverrideCollisionE(key)
    return origin._overrides[key] }}


///// Function identity
// Returns the parameter it is given, as-is.
//
// identity :: a -> a
function identity(x) {
  return x }


///// Function callable_p
// Does the given `subject' implement `[[Call]]`?
//
// callable_p :: a -> Bool
function callable_p(subject) {
  return typeof subject == 'function' }


///// Function from_properties
// Returns a new object containing only the given `names' from `origin'.
//
// The resulting properties can be, optionally, mapped through a
// `mapping' function.
//
// Note that the object is flattened, and the prototype chain is not
// maintained. Only own-enumerable keys will be copied over, if they are
// also present in the `names' list.
//
// from_properties :: Object, [String], (String -> String)? -> Object
function from_properties(origin, names, mapping) {
  mapping = mapping || identity
  return names.reduce( function(result, key) {
                         result[mapping(key)] = origin[key]
                         return result }
                     , {} )}


///// Function from_mappings
// :convenience: from_properties
//
// Returns a new object where all of the keys are transformed by a
// `mapping' function.
//
// Note that the object is flattened, and the prototype chain is not
// maintained. Only own-enumerable keys will be copied over.
//
// This is a convenience method for calling `from_properties', where all
// of the keys should be copied over, rather than only a subset of it.
//
// from_mappings :: Object, (String -> String)? -> Object
function from_mappings(origin, mapping) {
  return from_properties(origin, keys(origin), mapping) }



//// -- Core combinators -----------------------------------------------

///// Object Pandora
//
// A wrapper over a service object, which aims to provide useful
// combinators for a declarative definition of formal and composable
// modules.
//
// Basically, a wrapper holds a service object, which defines what kind
// of properties it exposes, a list of required properties, which
// defines what services *must* be implemented in the unwrapped module,
// and a set of explicit overrides, in which case those properties will
// be preferred should a key collision arise.
//
// When a wrapper is unwrapped by a call to the `value' method, that's
// equivalent to just passing the wrapper alone over to the `merge'
// call. All of the requirements must be met by the wrapper alone, and
// overrides have no effect — there can't be any collision!
//
// The combinators provided by this object allows one to expose a
// particular set of properties from the underlying service, as well as
// declare formal requirements and overrides.
//
// All of these combinators are pure. They always return a brand new
// Pandora instance. The underlying services, requirements and overrides
// are also cloned everytime a new instance is made.
//
//
// :Interface: Pandora
//    -- The underlying service object being wrapped.
//    _value     :: Object
//
//    -- The list of required properties this wrapper expects to be
//    -- implemented.
//    _required  :: [String]
//
//    -- The set of properties this wrapper explicitly overrides.
//    _overrides :: {String -> Bool}
var Pandora = {

  ////// Function make
  // Returns a new Pandora wrapper instance for the given `object'.
  //
  // make :: Object, [String], {String -> Bool} -> Pandora
  make:
  function _make(object, required, overrides) {
    var instance = inherit(this)

    instance._value     = clone(object    || {})
    instance._required  = slice(required  || this._required  || [])
    instance._overrides = clone(overrides || this._overrides || {})

    return instance }


  ////// Function value
  // Unwraps this Pandora instance, checking if the requirements are
  // met.
  //
  // value :: @Pandora -> Object
, value:
  function _value() {
    return merge(this) }


  ////// Function only
  // Defines a new service that exposes only the given names.
  //
  // only :: @Pandora, String... -> Pandora
, only:
  function _only() {
    return this.make(from_properties(this._value, slice(arguments))) }


  ////// Function hide
  // Defines a new service that *does not* expose the given names.
  //
  // hide :: @Pandora, String... -> Pandora
, hide:
  function _hide() {
    var hidden = slice(arguments)
    var names  = keys(this._value).filter(function(key) {
                                            return !~hidden.indexOf(key) })

    return this.make(from_properties(this._value, names)) }


  ////// Function prefix
  // Defines a new service that prefixes all names with the given
  // prefix.
  //
  // prefix :: @Pandora, String -> Pandora
, prefix:
  function _prefix(name) {
    return this.make(from_mappings(this._value, function(key){
                                                  return name + key })) }



  ////// Function alias
  // Defines a new service where keys are transformed by the given
  // mapping function or object.
  //
  // alias :: @Pandora, (String -> String) -> Pandora
  // alias :: @Pandora, {String -> String} -> Pandora
, alias:
  function _alias(map) {
    var mapping = callable_p(map)?  map
                : /* otherwise */   function(key) {
                                      return key in map?      map[key]
                                      :      /* otherwise */  key }

    return this.make(from_mappings(this._value, mapping)) }


  ////// Function map
  // Defines a new service where *values* are transformed by the given
  // mapping function.
  //
  // map :: @Pandora, (a, String, {String -> a} -> a) -> Pandora
, map:
  function _map(mapping) {
    var value = this._value
    return this.make(keys(value).reduce( function(result, key) {
                                           result[key] = mapping(value[key], key, value)
                                           return result }
                                       , {} ))}


  ////// Function need
  // Marks the given names as required.
  //
  // Required names *must* be implemented in the unwrapped module,
  // otherwise it's an error.
  //
  // need :: @Pandora, String... -> Pandora
, need:
  function _need() {
    return this.make(this._value, this._required.concat(slice(arguments))) }


  ////// Function override
  // Marks the given names as explicit overrides.
  //
  // Overrides allow Pandora to choose which service to choose when a
  // key collision happens. Note that it's still an error for two
  // different wrappers to define an override for the same key.
  //
  // override :: @Pandora, String... -> Pandora
, override:
  function _override() {
    var overrides = clone(this._overrides)
    slice(arguments).forEach(function(key){ overrides[key] = true })

    return this.make(this._value, this._required, overrides) }
}



//// -- Error handling -------------------------------------------------

///// Function PandoraNotSatisfiedE
// Error factory for unsatisfied requirements in a Pandora unwrapping.
//
// PandoraNotSatisfiedE :: [String] -> Error
function PandoraNotSatisfiedE(required) {
  var message = 'The following module\'s requirements haven\'t been met:\n  - '
              + required.join('\n  - ')
  var error   = Error.call(inherit(Error.prototype), message)
  error.name = 'PandoraNotSatisfiedE'
  return error }


///// Function PandoraCollisionE
// Error factory for key collisions in a Pandora unwrapping.
//
// PandoraCollisionE :: String -> Error
function PandoraCollisionE(key) {
  var error = Error.call( inherit(Error.prototype)
                        , 'The key "' + key + '" already exists in the target module.')
  error.name = 'PandoraCollisionE'
  return error }


///// Function PandoraOverrideCollisionE
// Error factory for override collisiosn in a Pandora unwrapping.
//
// PandoraOverrideCollisionE :: String -> Error
function PandoraOverrideCollisionE(key) {
  var error = Error.call( inherit(Error.prototype)
                        , 'The key "' + key + '" is already overriden by another module.')
  error.name = 'PandoraOverrideCollisionE'
  return error }


///// Function raise
// Helper function to allow throwing errors at the expression level.
//
// raise :: Error -> ()
function raise(error) { throw error }



//// -- Exports --------------------------------------------------------
module.exports = { pandora : pandora
                 , merge   : merge
                 , Pandora : Pandora

                 , internal: { identity                  : identity
                             , callable_p                : callable_p
                             , satisfied_p               : satisfied_p
                             , from_properties           : from_properties
                             , from_mappings             : from_mappings
                             , copy_keys                 : copy_keys

                             , raise                     : raise
                             , PandoraNotSatisfiedE      : PandoraNotSatisfiedE
                             , PandoraCollisionE         : PandoraCollisionE
                             , PandoraOverrideCollisionE : PandoraOverrideCollisionE }}
});
require("/pandora.js");
