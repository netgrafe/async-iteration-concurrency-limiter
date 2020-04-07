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
    let promiseWrappers;
    let asynFnStub;

    beforeEach(() => {
        promiseWrappers = [];
        promises = listOfValues.map((v, index) => {
            promiseWrappers[index] = {};

            return new Promise((resolve, reject) => {
                promiseWrappers[index].resolve = resolve;
                promiseWrappers[index].reject = reject;
            })
        });
        resolveValues = listOfValues.map((value) => `result-of-${value}`);

        asynFnStub = sinon.stub();

        asynFnStub.callsFake((input) => {
            const index = listOfValues.indexOf(input);
            return promises[index];
        })
    });

    describe('WHEN function called with default options', (done) => {
        it('should call the function at max number of concurrency, until there is no resolving', () => {
            // WHEN
            let endResult;

            const result = SUT(listOfValues, asynFnStub, 2);

            result.then(res => {
                expect(endResult).to.have.ordered.members(
                    listOfValues.map((val, index) => ({ status: 'fulfilled', value: resolveValues[index] }))
                );
                done();
            });

            // THEN
            expect(asynFnStub).to.have.been.calledWith(listOfValues[0]);
            expect(asynFnStub).to.have.been.calledWith(listOfValues[1]);
            expect(asynFnStub.callCount).to.equal(2);
            expect(endResult).to.be.undefined;

            // WHEN
            promiseWrappers[1].resolve(resolveValues[1]);

            // THEN
            expect(asynFnStub).to.have.been.calledWith(listOfValues[2]);
            expect(asynFnStub.callCount).to.equal(3);
            expect(endResult).to.be.undefined;

            // WHEN
            promiseWrappers[0].resolve(resolveValues[0]);
            expect(asynFnStub.callCount).to.equal(3);
            expect(endResult).to.be.undefined;

            // WHEN
            promiseWrappers[2].resolve(resolveValues[2]);


        });
    });
});