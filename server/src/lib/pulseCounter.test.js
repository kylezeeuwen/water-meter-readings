const PulseCounter = require('./pulseCounter')
const sinon = require('sinon')
const chai = require('chai')

const noop = () => {}
const maxValue = 100 // just for these tetss to make the math simple

describe('PulseCounter', function () {
  describe.skip('Validation', function () {

  })

  describe.skip('Overflow Detection', function () {

  })

  describe('Get Pulse Count', function () {
    it('base case : no diff, no overflow', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 5})
      chai.expect(pc.getPulseCount()).to.equal(0)
    })

    it('zero overflow and current > base', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 6})
      chai.expect(pc.getPulseCount()).to.equal(1)
    })

    it('zero overflow and current = max value', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: maxValue})
      chai.expect(pc.getPulseCount()).to.equal(95)
    })

    // this shows an assumption : that the reading will roll from maxValue to 1, not maxValue to 0
    it('with one overflow and current = 0', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 0, overflow: 1})
      chai.expect(pc.getPulseCount()).to.equal(95)
    })

    it('with one overflow and current < base', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 10, overflow: 1})
      chai.expect(pc.getPulseCount()).to.equal(105)
    })

    it('with one overflow and current = base', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 5, overflow: 1})
      chai.expect(pc.getPulseCount()).to.equal(maxValue)
    })

    it('with one overflow and current > base', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 10, overflow: 1})
      chai.expect(pc.getPulseCount()).to.equal(105)
    })

    it('with one overflow and current = maxvalue', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: maxValue, overflow: 1})
      chai.expect(pc.getPulseCount()).to.equal(195)
    })

    it('with two overflow and current = 0', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 0, overflow: 2})
      chai.expect(pc.getPulseCount()).to.equal(195)
    })

    it('with two overflow and current < base', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 1, overflow: 2})
      chai.expect(pc.getPulseCount()).to.equal(196)
    })

    it('with two overflow and current = base', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 5, overflow: 2})
      chai.expect(pc.getPulseCount()).to.equal(200)
    })

    it('with two overflow and current > base', function () {
      const pc = newPulseCounterWithDefaults({base: 5, current: 10, overflow: 2})
      chai.expect(pc.getPulseCount()).to.equal(205)
    })

    describe('edge cases where base = 0', function () {
      it('base case : no diff, no overflow', function () {
        const pc = newPulseCounterWithDefaults({base: 0, current: 0})
        chai.expect(pc.getPulseCount()).to.equal(0)
      })

      it('zero overflow and current > base', function () {
        const pc = newPulseCounterWithDefaults({base: 0, current: 5})
        chai.expect(pc.getPulseCount()).to.equal(5)
      })

      it('with one overflow and current = 0', function () {
        const pc = newPulseCounterWithDefaults({base: 0, current: 0, overflow: 1})
        chai.expect(pc.getPulseCount()).to.equal(100)
      })

      it('with two overflow and current > 0', function () {
        const pc = newPulseCounterWithDefaults({base: 0, current: 10, overflow: 1})
        chai.expect(pc.getPulseCount()).to.equal(110)
      })

      it('with two overflow and current = 0', function () {
        const pc = newPulseCounterWithDefaults({base: 0, current: 0, overflow: 2})
        chai.expect(pc.getPulseCount()).to.equal(200)
      })
    })

    describe('edge cases where base = max', function () {
      it('base case : no diff, no overflow', function () {
        const pc = newPulseCounterWithDefaults({base: maxValue, current: maxValue})
        chai.expect(pc.getPulseCount()).to.equal(0)
      })

      it('one overflow and current = 0', function () {
        const pc = newPulseCounterWithDefaults({base: maxValue, current: 0, overflow: 1})
        chai.expect(pc.getPulseCount()).to.equal(0)
      })

      it('one overflow and current > 0', function () {
        const pc = newPulseCounterWithDefaults({base: maxValue, current: 5, overflow: 1})
        chai.expect(pc.getPulseCount()).to.equal(5)
      })

      it('one overflow and current = maxValue', function () {
        const pc = newPulseCounterWithDefaults({base: maxValue, current: maxValue, overflow: 1})
        chai.expect(pc.getPulseCount()).to.equal(100)
      })

      it('with two overflow and current = 0', function () {
        const pc = newPulseCounterWithDefaults({base: maxValue, current: 0, overflow: 2})
        chai.expect(pc.getPulseCount()).to.equal(100)
      })

      it('with two overflow and current > 0', function () {
        const pc = newPulseCounterWithDefaults({base: maxValue, current: 5, overflow: 2})
        chai.expect(pc.getPulseCount()).to.equal(105)
      })
    })
  })

  describe('Get Meter Reading In Litres', function () {
    it('should multiply the pulse count by the litres per pulse and adds to the base reading', function () {
      const pc = new PulseCounter({
        meterReadingBase: 10,
        litresPerPulse: 10
      })
      sinon.stub(pc, 'getPulseCount').returns(10)

      chai.expect(pc.getMeterReadingInLitres()).to.equal(110)
    })
  })
})

function newPulseCounterWithDefaults({
 base = 0,
 max = maxValue,
 current = 0,
 overflow = 0,
}) {
  return new PulseCounter({
    pulseCountBase: base,
    pulseCountMaxValue: max,
    pulseCountCurrent: current,
    overflowCount: overflow
  })
}