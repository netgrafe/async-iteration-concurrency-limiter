const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const expect = chai.expect;

chai.use(sinonChai);

const SUT = require('../index');

describe('Test concurrency limiter', () => {
    const listOfValues = [ 'a', 'b', 'c'];
    let resolveValues = listOfValues.map(v => `resolved-${v}`);
    let rejectReasons = listOfValues.map(v => `error-${v}`);
    let promises;
    let asynFnStub;

    beforeEach(() => {
        // promiseWrappers = [];
        resolveValues = listOfValues.map((value) => `result-of-${value}`);

        asynFnStub = sinon.stub();
        promises = {};

        asynFnStub.callsFake((input) => {
            const thenCallbacks = [];
            const catchCallbacks = [];

            const fakePromise = {
                then(callback) {
                    thenCallbacks.push(callback);
                    return this;
                },
                catch(callback) {
                    catchCallbacks.push(callback);
                    return this;
                },
                resolve() {
                    const index = listOfValues.indexOf(input);
                    thenCallbacks[0](resolveValues[index]);
                    thenCallbacks[1]();
                },
                reject() {
                    const index = listOfValues.indexOf(input);
                    catchCallbacks[0](rejectReasons[index]);
                    thenCallbacks[1]();
                }
            };

            promises[input] = fakePromise;

            return fakePromise;
        })
    });

    describe('WHEN function called with default options', () => {
        describe('AND WHEN all the asyn function calls are resolved', () => {
            it('should only call the function third time if any previous finished and should eventually resolve with a Promise.allSettled compatible result', async () => {
                // WHEN
                const result = SUT(listOfValues, asynFnStub, 2);

                // THEN
                expect(asynFnStub).to.have.been.calledWith(listOfValues[0]);
                expect(asynFnStub).to.have.been.calledWith(listOfValues[1]);
                expect(asynFnStub.callCount).to.equal(2);

                // WHEN
                promises[listOfValues[0]].resolve();

                // THEN
                expect(asynFnStub).to.have.been.calledWith(listOfValues[2]);
                expect(asynFnStub.callCount).to.equal(3);

                // WHEN
                promises[listOfValues[2]].resolve();

                // THEN
                expect(asynFnStub.callCount).to.equal(3);

                // WHEN
                promises[listOfValues[1]].resolve();

                // THEN
                const endResult = await result;

                expect(endResult.length).to.equal(3);
                expect(endResult).to.have.same.deep.members(listOfValues.map((v, index) => ({
                    status: 'fulfilled',
                    value: resolveValues[index]
                })));
            });
        });

        describe('AND WHEN the first async call is rejected', () => {
            it('should only call the function third time if any previous finished', async () => {
                // WHEN
                const result = SUT(listOfValues, asynFnStub, 2);

                // THEN
                expect(asynFnStub).to.have.been.calledWith(listOfValues[0]);
                expect(asynFnStub).to.have.been.calledWith(listOfValues[1]);
                expect(asynFnStub.callCount).to.equal(2);

                // WHEN
                promises[listOfValues[0]].reject();

                // THEN
                expect(asynFnStub).to.have.been.calledWith(listOfValues[2]);
                expect(asynFnStub.callCount).to.equal(3);

                // WHEN
                promises[listOfValues[2]].resolve();

                // THEN
                expect(asynFnStub.callCount).to.equal(3);

                // WHEN
                promises[listOfValues[1]].resolve();

                // THEN
                const endResult = await result;

                expect(endResult.length).to.equal(3);
                expect(endResult).to.have.same.deep.members([
                    {
                        status: 'rejected',
                        reason: rejectReasons[0]
                    },
                    {
                        status: 'fulfilled',
                        value: resolveValues[1]
                    },
                    {
                        status: 'fulfilled',
                        value: resolveValues[2]
                    }
                ]);
            });
        });
    });

    describe('WHEN function called with failFast options', () => {
        describe('AND WHEN all promises are resolved', () => {
            it('should eventually resolve with a Promise.all compatible result', async () => {
                // WHEN
                const result = SUT(listOfValues, asynFnStub, 2, {
                    failFast: true
                });

                // THEN
                expect(asynFnStub).to.have.been.calledWith(listOfValues[0]);
                expect(asynFnStub).to.have.been.calledWith(listOfValues[1]);
                expect(asynFnStub.callCount).to.equal(2);

                // WHEN
                promises[listOfValues[0]].resolve();

                // THEN
                expect(asynFnStub).to.have.been.calledWith(listOfValues[2]);
                expect(asynFnStub.callCount).to.equal(3);

                // WHEN
                promises[listOfValues[1]].resolve();
                promises[listOfValues[2]].resolve();

                const endResult = await result;

                expect(endResult).to.have.all.members(resolveValues);
            });
        });

        describe('AND WHEN one of the promises is rejected', () => {
            it('should eventually reject with the reason of the first failing promise', async () => {
                // WHEN
                const result = SUT(listOfValues, asynFnStub, 2, {
                    failFast: true
                });

                // THEN
                expect(asynFnStub).to.have.been.calledWith(listOfValues[0]);
                expect(asynFnStub).to.have.been.calledWith(listOfValues[1]);
                expect(asynFnStub.callCount).to.equal(2);

                // WHEN
                promises[listOfValues[0]].reject();

                // WHEN
                promises[listOfValues[1]].resolve();

                try {
                    await result;

                    throw 'The result Promise should not be resolved at all.';
                } catch (error) {
                    // THEN
                    expect(asynFnStub).not.to.have.been.calledWith(listOfValues[2]);
                    expect(asynFnStub.callCount).to.equal(2);

                    expect(error).to.equal(rejectReasons[0]);
                }
            });
        });
    });

    describe('WHEN an onProgress callback is given', () => {
        describe('AND WHEN all promises are resolved', () => {
            it('should call the onProgress callback for all the elements', async () => {
                // GIVEN
                const onProg = sinon.stub();

                // WHEN
                const result = SUT(listOfValues, asynFnStub, 2, {
                    failFast: true,
                    onProgress: onProg
                });

                promises[listOfValues[1]].resolve();

                // THEN
                expect(onProg).to.have.been.calledWith({
                    percentage: 33.33,
                    done: 1,
                    total: 3,
                    finishedItem: listOfValues[1]
                });

                // WHEN
                promises[listOfValues[0]].resolve();

                // THEN
                expect(onProg).to.have.been.calledWith({
                    percentage: 66.67,
                    done: 2,
                    total: 3,
                    finishedItem: listOfValues[0]
                });

                // WHEN
                promises[listOfValues[2]].resolve();

                // THEN
                expect(onProg).to.have.been.calledWith({
                    percentage: 100,
                    done: 3,
                    total: 3,
                    finishedItem: listOfValues[2]
                });
            });
        });

        describe('AND WHEN one of the promises is rejected', () => {
            it('should call the onProgress for all the done promises which closed before fast fail', async () => {
                // GIVEN
                const onProg = sinon.stub();

                // WHEN
                const result = SUT(listOfValues, asynFnStub, 2, {
                    failFast: true,
                    onProgress: onProg
                });

                promises[listOfValues[1]].resolve();

                // THEN
                expect(onProg).to.have.been.calledWith({
                    percentage: 33.33,
                    done: 1,
                    total: 3,
                    finishedItem: listOfValues[1]
                });

                // WHEN
                promises[listOfValues[0]].reject();
                promises[listOfValues[2]].resolve();

                try {
                    await result;

                    throw 'It should be rejected';
                } catch (error) {
                    expect(asynFnStub).to.have.been.calledWith(listOfValues[2]);
                    expect(asynFnStub.callCount).to.equal(3);
                    expect(onProg.callCount).to.equal(1);
                }
            });
        });


    });
});