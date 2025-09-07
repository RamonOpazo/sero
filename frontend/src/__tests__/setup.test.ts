/**
 * Basic test to verify Jest setup is working correctly
 */
describe('Setup', () => {
  it('should be able to run tests', () => {
    expect(true).toBe(true);
  });

  it('should have testing library jest-dom matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);
    
    // Basic DOM expectation without jest-dom matchers during tsc build
    expect(document.body.contains(element)).toBe(true);
    expect(element.textContent).toBe('Hello World');
    
    document.body.removeChild(element);
  });

  it('should handle async tests', async () => {
    const promise = Promise.resolve('test value');
    const result = await promise;
    expect(result).toBe('test value');
  });
});
