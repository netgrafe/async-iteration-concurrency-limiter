# async-iteration-concurrency-limiter
Run an async processor function over an array of values with limited concurrency, useful for working with large number of files.

## Install

```
npm i async-iteration-concurrency-limiter
```

## Usage

```
const readExif = require('read-exif');
const limiter = require('async-iteration-concurrency-limiter');
const photoFiles = [
    'img_1.jpg',
    'img_2.jpg
]

// simple, silent mode
const exifInfos = await limiter(photoFiles, readExif, 30)

// fail at first Promise rejection and report progress
const exifInfos = await limiter(photoFiles, readExif, 30, {
    failFast: true, // default
    onProgress: (prog) => {
        console.log(prog.percentage, `${prog.done} / ${prog.total})
    }
});
```

## Motivation

When I need to process large number of files (like photos, music files) the maximum number of files can be handled by the processor is limited, too many parallel Promise kills the computer.

I needed a simple function which gets a list of values and an async function to run with each of the values, but only run a given number of processes in parallel at the same time.

Also, nice to have an update about the progress.
