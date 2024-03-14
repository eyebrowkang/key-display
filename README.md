# Key Display

[![GitHub license](https://img.shields.io/github/license/eyebrowkang/key-display)](https://github.com/eyebrowkang/key-display/blob/main/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/key-display)](https://www.npmjs.com/package/key-display)

Display key press on web page

This is a simple web component, you can use it just like normal html element.

## Features

- display key press
- merge repeat key press and show repeat count
- combine modifier key and other key

## Install

`npm install key-display`

or just copy the `key-display.js` file

## How to use

Please check the [example](./example/index.html)

```html
<script type="module">
  import defineKeyDisplay from "../key-display.js";
  defineKeyDisplay({
    maxKeys: 3,
    timeout: 100000,
    upperLetter: false,
    mergeModifierKey: false,
    mergeRepeatKey: true,
    showRepeatCount: true,
  });

  window.onload = () => {
    const keyDisplay = document.createElement("key-display");
    document.body.appendChild(keyDisplay);
  };
</script>
```

## Configuration

- `maxKeys`: max number of displayed keys
- `timeout`: time to disappear
- `upperLetter`: convert letter to uppercase
- `mergeModifierKey`: for example: <kbd>Shift + Q</kbd>
- `mergeRepeatKey`: merge last repeat key press
- `showRepeatCount`: show repeat count
