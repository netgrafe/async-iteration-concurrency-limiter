# async-iteration-concurrency-limiter
Run an async processor function over an array of values with limited concurrency, useful for working with large number of files.

## Install

```
npm i async-iteration-concurrency-limiter
```

## Usage

```
const limiter = require('async-iteration-concurrency-limiter');
// our async function
const readExif = require('read-exif');

// input to iterate on
const photoFiles = [
    'img_1.jpg',
    'img_2.jpg',
    ...
]

// simple, silent mode, similar to Promise.allSettled

const exifInfos = await limiter(photoFiles, readExif, 30)


// fail at first Promise rejection and report progress

const exifInfos = await limiter(photoFiles, readExif, 30, {
    failFast: true, // default is false
    onProgress: (prog) => {
        console.log(prog.percentage, `${prog.done} / ${prog.total})
    }
});
```

## Signature
`limiter(listOfValues, asyncFn, concurrency, opts)`

- `inputArray`: *Array[any]*
    - a list of values which serve as input for the async function
- `asyncFn`: *asnyc Function*
    - an async function which returns a thennable (Promise prefferrably) and gets an input value (one of the elements of `inputArray`)
- `concurrency`: *Number*
    - the number of maximum asnyc processes to run in parallel
- `opts`: *Object*
    - `failFast`: *Boolean* (`false` by default)
        - if it is `true`: the whole functionality behaves like `Promise.all` which resolves with the array of resolving values or rejects if any of the promises fails.
        - if it is `false`: the whole functionality behaves like `Promise.allSettled` - so basically always fulfilled and for each async process we have either
        ```
        {
            status: 'fulfilled',
            value: resolvedValueFromPromise
        }
        ```
        or
        ```
        {
            status: 'rejected',
            reason: promiseRejectionError
        }
        ```
    - `onProgress`: *Function*
        - a callback function which is being called after each successful `asyncFn` call resolultion.
        NOTE: if `failFast` is true, only those promises are reported this way, which are finished before the first failing promise.

### Returns: Promise
- if `opts.failFast` is true
    - Promise resolved by Array of resolve values
    - or rejected by the first failing error
    - same way like `Promise.all`
- if `opts.failFast` is false (by default)
    - Promise is basically always fulfilled and for each async calls it
    contains an object describing the `status` and `value` (fulfilled ones) or `reason` (for rejected ones)
    - same way like `Promise.allSettled`

## Example
### Code
```
const input = [1,2,3,4,5,6,7,8,9,10,11,12,13,14]

function asyncFn(input) {
    return new Promise((resolve) => {
        const delay = Math.floor(Math.random() * 1000);
        setTimeout(() => {
            resolve(`some-resolve-value-for-${input} - delay: ${delay}ms`);
        }, delay);
    });
}

const limiter = require('./index');

limiter(input, asyncFn, 3, {
    onProgress: (stat) => console.log(stat)
}).then(results => {
    // compatible with Promise.allSettled() response
    console.log('RESULTS:');
    console.log(results);
});
```

### Result
While the itesm are picked once a previous async elem is finished so their finishing order might be random, the result is still ordered and has exact mapping with original input array.
```
{ percentage: 7.14, done: 1, total: 14, finishedItem: 2 }
{ percentage: 14.29, done: 2, total: 14, finishedItem: 3 }
{ percentage: 21.43, done: 3, total: 14, finishedItem: 1 }
{ percentage: 28.57, done: 4, total: 14, finishedItem: 5 }
{ percentage: 35.71, done: 5, total: 14, finishedItem: 4 }
{ percentage: 42.86, done: 6, total: 14, finishedItem: 6 }
{ percentage: 50, done: 7, total: 14, finishedItem: 8 }
{ percentage: 57.14, done: 8, total: 14, finishedItem: 9 }
{ percentage: 64.29, done: 9, total: 14, finishedItem: 11 }
{ percentage: 71.43, done: 10, total: 14, finishedItem: 10 }
{ percentage: 78.57, done: 11, total: 14, finishedItem: 7 }
{ percentage: 85.71, done: 12, total: 14, finishedItem: 12 }
{ percentage: 92.86, done: 13, total: 14, finishedItem: 13 }
{ percentage: 100, done: 14, total: 14, finishedItem: 14 }

RESULTS:
[ { status: 'fulfilled',  value: 'some-resolve-value-for-1 - delay: 561ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-2 - delay: 242ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-3 - delay: 356ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-4 - delay: 881ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-5 - delay: 651ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-6 - delay: 771ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-7 - delay: 811ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-8 - delay: 208ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-9 - delay: 192ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-10 - delay: 301ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-11 - delay: 64ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-12 - delay: 426ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-13 - delay: 464ms' },
  { status: 'fulfilled',  value: 'some-resolve-value-for-14 - delay: 586ms' } ]
```

## Motivation

When I need to process large number of files (like photos, music files) the maximum number of files can be handled by the processor is limited, too many parallel Promise kills the computer.

I needed a simple function which gets a list of values and an async function to run with each of the values, but only run a given number of processes in parallel at the same time.

Also, nice to have an update about the progress.
