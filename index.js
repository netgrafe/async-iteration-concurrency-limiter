function asnycIterationConcurrencyLimiter(listOfValues, asyncFn, concurrency, opts) {
    return new Promise((resolve, reject) => {
        const queue = [];
        const numberOfActivePromises = 0;
        const donePromises = 0;
        const results = [];

        function pickNext() {
            if (queue.length > 0) {
                const next = queue.shift();

                next();
            } else if (numberOfActivePromises === 0) {
                resolve(results);
            }
        }

        async function process(value, asyncFn, index) {
            numberOfActivePromises++;

            asyncFn(value).then((result) => {
                if (opts.failFast) {
                    results[index] = result;
                } else {
                    results[index] = {
                        status: 'fulfilled',
                        value: result
                    };
                }
            }).catch((error) => {
                if (opts.failFast) {
                    reject(error);
                } else {
                    results[index] = {
                        status: 'rejected',
                        reasons: error
                    }
                }
            }).then(() => {
                donePromises++;
                numberOfActivePromises--;

                if (opts.onProgress) {
                    onProgress({
                        percentage: Number(((donePromises / listOfValues.length) / 100).toFixed()),
                        done: donePromises,
                        total: listOfValues.length
                    });
                }

                pickNext();
            });
        }

        function putToQueue(value, asyncFn, index) {
            if (numberOfActivePromises <= concurrency) {
                process(value, asyncFn, index);
            } else {
                queue.push(process.bind(null, value, asyncFn, index));
            }
        }

        listOfValues.forEach((value, index) => putToQueue(value, asyncFn, index));
    });
}

module.exports = asnycIterationConcurrencyLimiter;