[![
  Russia invaded Ukraine,
  killing tens of thousands of civilians and displacing millions more.
  It's a genocide.
  Please help us defend freedom, democracy and Ukraine's right to exist.
](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner-direct-single.svg)](https://vshymanskyy.github.io/StandWithUkraine)

# rehype-web-components 🚧

**[rehype][]** plugin to process replace custom elements
with corresponding pre-defined templates.
Supports interpolation with attribute values,
CSS scoping with [CSS modules][css-modules]
and limited script evaluation to setup the component.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`unified().use(rehypeComponents[, options])`](#unifieduserehypecomponents-options)
*   [Example](#example)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Related](#related)
*   [License](#license)

## What is this?

This package is a [unified][] ([rehype][]) plugin
that transforms custom elements with templates
loaded from specified directories.
Also, it substitutes slots according to the spec,
interpolates host attributes in the template
and executes basic setup scripts prior to interpolation.

**unified** is a project that transforms content
with abstract syntax trees (ASTs).
**rehype** adds support for HTML to unified.
**hast** is the HTML AST that rehype uses.
This is a rehype plugin that runs PostCSS on `<style>` elements
and other elements that have a `style` attribute.

## When should I use this?

When you cannot fit your HTML development into a single file
and want to split it up to logical components;
when you still want to stick to bare HTML and its specs
rather then going far to custom syntax of a template engine.

When you want Svelte features like value interpolation and style scoping
but want to keep the project without client scripts.

When you want web components but with semantics and no JavaScript again.

## Install

This package is [ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
In Node.js (version 12.20+, 14.14+, or 16.0+), install with [npm][]:

```sh
npm install rehype-postcss
```

In Deno with [`esm.sh`][esmsh]:

```js
import rehypeComponents from 'https://esm.sh/rehype-postcss@0.1'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import rehypeComponents from 'https://esm.sh/rehype-postcss@6?bundle'
</script>
```

## Use

Say we have the following file `example.html`:

```html
<my-component>Hello! 👋</my-component>
```

along with `components/my-component.html`:

```html
<h1><slot></slot></h1>
```

And our module `example.js` looks as follows:

```js
import { read } from 'to-vfile'
import { rehype } from 'rehype'
import rehypeComponents from 'rehype-postcss'

const file = await rehype()
  .data('settings', { fragment: true })
  .use(rehypeComponents, {
    paths: ['components'],
  })
  .process(await read('example.html'))

console.log(String(file))
```

Now, running `node example.js` yields:

```html
<h1>Hello! 👋</h1>
```

## API

This package exports no identifiers.
The default export is `rehypeComponents`.

### `unified().use(rehypeComponents[, options])`

Runs (pseudo) web components processing.

##### `options`

Configuration (optional).

###### `options.paths`

###### `options.components`

## Example

Check more detailed example in the [`example`](./example) directory.

## Types

This package is not typed with [TypeScript][].
It can be though if you send a PR or when I have some extra time.

## Compatibility

The project is compatible with Node.js 18+.

## License

[MIT][license] © [Viktor Yakubiv][author]

<!-- Definitions -->

[npm]: https://docs.npmjs.com/cli/install

[esmsh]: https://esm.sh

[license]: ./LICENSE

[author]: https://yakubiv.com

[typescript]: https://www.typescriptlang.org

[unified]: https://github.com/unifiedjs/unified

[rehype]: https://github.com/rehypejs/rehype

[postcss]: https://github.com/postcss/postcss

[postcss-html]: https://github.com/ota-meshi/postcss-html

[postcss-load-config]: https://github.com/postcss/postcss-load-config

[css-modules]: https://github.com/css-modules/css-modules

[postcss-deno-example]: https://github.com/postcss/postcss#deno

[postcss-process]: https://postcss.org/api/#processor-process

[postcss-process-options]: https://postcss.org/api/#processoptions

[posthtml-postcss]: https://github.com/posthtml/posthtml-postcss
