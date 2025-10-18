import CodexReviewTool from './dist/tools/CodexReviewTool.js';

async function testImprovedTool() {
  const tool = new CodexReviewTool();
  
  try {
    console.log('🧪 Testing Improved Code Review Tool...\n');
    
    const result = await tool.execute({
      repositoryPath: process.cwd(),
      reviewType: 'staged',
      includeSuggestions: true,
      useCodex: true
    });
    
    console.log('📊 Code Review Results:');
    console.log('='.repeat(50));
    console.log(result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImprovedTool();

