Pandora
=======


Pandora is a module abstraction library, that brings combinators for
handling first-class modules in JavaScript. Modules are treated as
simple native objects, which can already be handled through the
object services provided by the JavaScript language itself::

   // some/module
   module.exports = { method1: ...
                    , method2: ...
                    , method3: ...
                    , method4: ... }

   // some/other/module
   module.exports = { method1: ...
                    , method2: ...
                    , method4: ... }
   
   // package
   var module = pandora(require('some/module'))
                  .hide('method1', 'method2')
                  .alias({method3: 'my_method'})
                  .need('method4')
                  
   var module2 = pandora(require('some/other/module'))
                   .override('method4')

   var pack = pandora.merge(module, module2)
   pack.method1()   // => some/other/module
   pack.method2()   // => some/other/module
   pack.method3()   // => ReferenceError
   pack.method4()   // => some/other/module
   pack.my_method() // => some/module


Pandora extends these core services with a series of pure
combinators, which brings a declarative-ish syntax for module
definition and formal contracts a module expects to be met.

There is no need for providing a CommonJS module service under
Pandora, since the library works directly on objects. On environments
that support CommonJS modules, however, users can leverage better
modularisation and a rather more declarative syntax.

Most of these ideas are taken from Scheme, but there's plenty of
influence from Traits operator semantics and Piccola, as well.


Installing
----------

With Node.js and NPM, just do the easy-modo install::

    $ npm install pandora

    # Then require it as usual
    node> var pandora = require('pandora')

To install in a browser, point your files to ``build/pandora.js`` or
``build/pandora.min.js``. Note that you'll have to include
``browserify`` separately — a barebones build is also on the ``build``
folder::

    <html>
      <head><title>Foo!</title></head>
      <body>
        ( ... )
        <script src="/path/to/browserify.js"></script>
        <script src="/path/to/pandora.js"></script>
        <script> /* use pandora here */ </script>
      </body>
    </html>

If you want to live on the edge, you can also install directly from the
`Github`_ repository.


.. _Github: http://github.com/killdream/pandora


Testing
-------

Tests are written using the `mocha`_ library, and the `expect.js`_
assertions. To run, make sure you have both in your ``node_modules``
path and just run ``mocha``::

    $ cd /path/to/pandora
    $ mocha

    # Alternatively you can use npm
    $ npm run-script test

For running the coverage reports, you'll need `jscoverage`_ installed
and a recent version of `mocha`_::

    $ export MOCHA_TEST_ENV=1
    $ jscoverage src src-cov
    $ mocha --reporter html-cov > test/coverage.html

To run tests in a browser, just open the ``test/browser/index.html`` page.

.. _mocha: http://visionmedia.github.com/mocha
.. _expect.js: http://github.com/visionmedia/expect.js
.. _jscoverage: https://github.com/visionmedia/node-jscoverage


Getting support
---------------

Pandora uses the `Github tracker`_ for tracking bugs and new features.

.. _Github tracker: http://github.com/killdream/pandora/issues


Licence
-------

Pandora is licensed under the delicious and permissive `MIT`_
licence. You can happily copy, share, modify, sell or whatever — refer
to the actual licence text for ``less`` information::

    $ less LICENCE.txt


.. _MIT: http://github.com/killdream/pandora/raw/master/LICENCE.txt
