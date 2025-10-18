// Test file for improved code review
function calculateSum(numbers: number[]): number {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum;
}

console.log(calculateSum([1, 2, 3, 4, 5]));

