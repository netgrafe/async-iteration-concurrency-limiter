const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const expect = chai.expect;

chai.use(sinonChai);

const SUT = require('../index');

describe('Test concurrency limiter', () => {
    const listOfValues = [ 'a', 'b', 'c'];
    let resolveValues;
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
                    thenCallbacks[0](input);
                    thenCallbacks[1]();
                },
                reject() {
                    catchCallbacks[0](`error-${input}`);
                    thenCallbacks[1]();
                }
            };

            promises[input] = fakePromise;

            return fakePromise;
        })
    });

    describe('WHEN function called with default options', () => {
        it('should call the function at max number of concurrency, until there is no resolving', async () => {
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
            expect(endResult).to.have.same.deep.members(listOfValues.map(v => ({
                status: 'fulfilled',
                value: v
            })));
        });
    });
});