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