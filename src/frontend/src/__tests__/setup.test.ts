/**
 * Basic test to verify Jest setup is working correctly
 */
describe('Jest Setup', () => {
  it('should be able to run tests', () => {
    expect(true).toBe(true);
  });

  it('should have testing library jest-dom matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);
    
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
    
    document.body.removeChild(element);
  });

  it('should handle async tests', async () => {
    const promise = Promise.resolve('test value');
    const result = await promise;
    expect(result).toBe('test value');
  });
});
