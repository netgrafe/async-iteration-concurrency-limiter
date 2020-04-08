function asnycIterationConcurrencyLimiter(listOfValues, asyncFn, concurrency, opts) {
    return new Promise((resolve, reject) => {
        const queue = [];
        const results = [];
        let numberOfActivePromises = 0;
        let donePromises = 0;

        function pickNext() {
            if (queue.length > 0) {
                const { value, index } = queue.shift();

                process(value, index);
            } else if (numberOfActivePromises === 0) {
                resolve(results);
            }
        }

        async function process(value, index) {
            numberOfActivePromises++;

            asyncFn(value).then((result) => {
                if (opts && opts.failFast) {
                    results[index] = result;
                } else {
                    results[index] = {
                        status: 'fulfilled',
                        value: result
                    };
                }
            }).catch((error) => {
                if (opts && opts.failFast) {
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

                if (opts && opts.onProgress) {
                    opts.onProgress({
                        percentage: Number(((donePromises / listOfValues.length) * 100).toFixed()),
                        done: donePromises,
                        total: listOfValues.length
                    });
                }

                pickNext();
            });
        }

        function putToQueue(value, index) {
            if (numberOfActivePromises < concurrency) {
                process(value, index);
            } else {
                queue.push({ value, index });
            }
        }

        listOfValues.forEach((value, index) => putToQueue(value, index));
    });
}

module.exports = asnycIterationConcurrencyLimiter;