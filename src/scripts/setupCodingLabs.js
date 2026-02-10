#!/usr/bin/env node

/**
 * Setup Coding Labs Script
 * 
 * This script will:
 * 1. Check if .env is configured
 * 2. Connect to MongoDB
 * 3. Create sample coding labs
 * 
 * Usage: npm run seed:coding-labs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import CodingLab from '../models/CodingLab.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import connectDB from '../config/database.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars - try multiple paths
const envPaths = [
  resolve(__dirname, '../../.env'), // From scripts directory (absolute)
  resolve(process.cwd(), '.env'), // From current working directory (absolute)
  resolve(process.cwd(), 'backend/.env'), // From project root (absolute)
  join(__dirname, '../../.env'), // Relative from scripts directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error && process.env.MONGODB_URI) {
      envLoaded = true;
      break; // Successfully loaded
    }
  }
}
if (!envLoaded) {
  dotenv.config(); // Also try from current working directory (default behavior)
}

console.log('========================================');
console.log('Coding Labs Setup');
console.log('========================================\n');

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI is not set\n');
  console.error('Tried loading from these paths:');
  envPaths.forEach((path, idx) => {
    const exists = existsSync(path);
    console.error(`   ${idx + 1}. ${path} ${exists ? '✓ (exists)' : '✗ (not found)'}`);
  });
  console.error('\nPlease ensure your backend/.env file contains:');
  console.error('MONGODB_URI=mongodb://localhost:27017/lms');
  console.error('(or your MongoDB connection string)\n');
  console.error('Alternatively, you can set it as an environment variable:');
  console.error('MONGODB_URI=mongodb://localhost:27017/lms npm run seed:coding-labs\n');
  process.exit(1);
}

console.log('✓ MONGODB_URI is configured');
console.log('Connecting to MongoDB...\n');

const seedCodingLabs = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Get or create default organization
    let org = await Organization.findOne();
    if (!org) {
      console.log('Creating default organization...');
      org = await Organization.create({
        name: 'Default Organization',
        logo: '',
        theme: {
          primaryColor: '#136dec',
          secondaryColor: '#136dec',
        },
      });
      console.log('✓ Organization created\n');
    } else {
      console.log('✓ Using existing organization\n');
    }

    // Get admin or trainer user
    let user = await User.findOne({
      $or: [{ role: 'admin' }, { role: 'super_admin' }, { role: 'trainer' }],
    });

    if (!user) {
      console.log('⚠ No admin/trainer user found. Creating one...');
      user = await User.create({
        email: 'trainer@lms.com',
        password: 'password123',
        role: 'trainer',
        status: 'active',
        organization: org._id,
        profile: {
          firstName: 'Trainer',
          lastName: 'User',
        },
      });
      console.log('✓ Trainer user created (trainer@lms.com / password123)\n');
    } else {
      console.log(`✓ Using existing user: ${user.email}\n`);
    }

    // Check if labs already exist
    const existingLabs = await CodingLab.countDocuments();
    if (existingLabs > 0) {
      console.log(`⚠ Found ${existingLabs} existing coding labs.`);
      console.log('Clearing existing labs to create new ones for all languages...\n');
      await CodingLab.deleteMany({});
      console.log('✓ Cleared existing coding labs\n');
    }

    console.log('Creating coding labs for all supported languages...\n');

    // Create coding labs for all supported languages
    const codingLabs = [
      // ========== JAVASCRIPT LABS ==========
      {
        title: 'Hello World in JavaScript',
        description: 'Write a simple program that prints "Hello, World!" to the console.',
        problemStatement: `Write a JavaScript program that prints "Hello, World!" to the console.

**Requirements:**
- Use console.log() to print the message
- The output should be exactly: Hello, World!`,
        language: 'javascript',
        starterCode: `// Write your code here
console.log("Hello, World!");`,
        solution: `console.log("Hello, World!");`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'Hello, World!',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Output must match exactly'],
        hints: ['Use console.log() function'],
        difficulty: 'easy',
        points: 10,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Sum of Two Numbers',
        description: 'Write a function that takes two numbers and returns their sum.',
        problemStatement: `Write a JavaScript function called \`sum\` that takes two numbers as parameters and returns their sum.

**Example:**
- sum(5, 3) should return 8
- sum(-1, 1) should return 0`,
        language: 'javascript',
        starterCode: `function sum(a, b) {
  // Write your code here
  return 0;
}`,
        solution: `function sum(a, b) {
  return a + b;
}`,
        testCases: [
          {
            input: '5,3',
            expectedOutput: '8',
            isHidden: false,
            points: 5,
          },
          {
            input: '-1,1',
            expectedOutput: '0',
            isHidden: false,
            points: 5,
          },
          {
            input: '10,20',
            expectedOutput: '30',
            isHidden: true,
            points: 5,
          },
        ],
        constraints: ['Function must be named "sum"', 'Must handle negative numbers'],
        hints: ['Use the + operator', 'Return the result'],
        difficulty: 'easy',
        points: 15,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Find Maximum Number',
        description: 'Write a function that finds the maximum number in an array.',
        problemStatement: `Write a JavaScript function called \`findMax\` that takes an array of numbers and returns the maximum value.

**Example:**
- findMax([1, 5, 3, 9, 2]) should return 9
- findMax([-5, -2, -10]) should return -2`,
        language: 'javascript',
        starterCode: `function findMax(arr) {
  // Write your code here
  return 0;
}`,
        solution: `function findMax(arr) {
  return Math.max(...arr);
}`,
        testCases: [
          {
            input: '[1,5,3,9,2]',
            expectedOutput: '9',
            isHidden: false,
            points: 5,
          },
          {
            input: '[-5,-2,-10]',
            expectedOutput: '-2',
            isHidden: false,
            points: 5,
          },
          {
            input: '[100,50,200,75]',
            expectedOutput: '200',
            isHidden: true,
            points: 10,
          },
        ],
        constraints: ['Array will contain at least one number', 'Must handle negative numbers'],
        hints: ['Use Math.max() or loop through the array', 'Consider using spread operator'],
        difficulty: 'medium',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Reverse a String',
        description: 'Write a function that reverses a string without using built-in reverse methods.',
        problemStatement: `Write a JavaScript function called \`reverseString\` that takes a string and returns it reversed.

**Example:**
- reverseString("hello") should return "olleh"
- reverseString("world") should return "dlrow"`,
        language: 'javascript',
        starterCode: `function reverseString(str) {
  // Write your code here
  return str;
}`,
        solution: `function reverseString(str) {
  let reversed = '';
  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}`,
        testCases: [
          {
            input: '"hello"',
            expectedOutput: 'olleh',
            isHidden: false,
            points: 5,
          },
          {
            input: '"world"',
            expectedOutput: 'dlrow',
            isHidden: false,
            points: 5,
          },
          {
            input: '"javascript"',
            expectedOutput: 'tpircsavaj',
            isHidden: true,
            points: 10,
          },
        ],
        constraints: ['Do not use built-in reverse() method', 'Must handle empty strings'],
        hints: ['Loop through the string backwards', 'Build a new string character by character'],
        difficulty: 'medium',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Check Palindrome',
        description: 'Write a function that checks if a string is a palindrome.',
        problemStatement: `Write a JavaScript function called \`isPalindrome\` that takes a string and returns true if it's a palindrome, false otherwise.

A palindrome reads the same forwards and backwards (ignoring case).

**Example:**
- isPalindrome("racecar") should return true
- isPalindrome("hello") should return false
- isPalindrome("A man a plan a canal Panama") should return true (ignoring spaces)`,
        language: 'javascript',
        starterCode: `function isPalindrome(str) {
  // Write your code here
  return false;
}`,
        solution: `function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}`,
        testCases: [
          {
            input: '"racecar"',
            expectedOutput: 'true',
            isHidden: false,
            points: 5,
          },
          {
            input: '"hello"',
            expectedOutput: 'false',
            isHidden: false,
            points: 5,
          },
          {
            input: '"A man a plan a canal Panama"',
            expectedOutput: 'true',
            isHidden: true,
            points: 10,
          },
        ],
        constraints: ['Ignore case', 'Ignore spaces and punctuation'],
        hints: ['Remove non-alphanumeric characters', 'Compare original with reversed'],
        difficulty: 'medium',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      // ========== PYTHON LABS ==========
      {
        title: 'Hello World in Python',
        description: 'Write a simple Python program that prints "Hello, World!" to the console.',
        problemStatement: `Write a Python program that prints "Hello, World!" to the console.

**Requirements:**
- Use print() function to output the message
- The output should be exactly: Hello, World!`,
        language: 'python',
        starterCode: `# Write your code here
print("Hello, World!")`,
        solution: `print("Hello, World!")`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'Hello, World!',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Output must match exactly'],
        hints: ['Use print() function'],
        difficulty: 'easy',
        points: 10,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Calculate Factorial in Python',
        description: 'Write a function that calculates the factorial of a number.',
        problemStatement: `Write a Python function called \`factorial\` that takes a positive integer n and returns its factorial.

Factorial of n (n!) = n × (n-1) × (n-2) × ... × 1

**Example:**
- factorial(5) should return 120
- factorial(3) should return 6`,
        language: 'python',
        starterCode: `def factorial(n):
    # Write your code here
    return 1`,
        solution: `def factorial(n):
    if n == 0 or n == 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result`,
        testCases: [
          {
            input: '5',
            expectedOutput: '120',
            isHidden: false,
            points: 5,
          },
          {
            input: '3',
            expectedOutput: '6',
            isHidden: false,
            points: 5,
          },
          {
            input: '7',
            expectedOutput: '5040',
            isHidden: true,
            points: 10,
          },
        ],
        constraints: ['n will be a positive integer', '0! = 1'],
        hints: ['Use a loop to multiply numbers', 'Handle the base case (0 and 1)'],
        difficulty: 'medium',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Check Prime Number in Python',
        description: 'Write a function that checks if a number is prime.',
        problemStatement: `Write a Python function called \`is_prime\` that takes a positive integer and returns True if it's prime, False otherwise.

A prime number is a number greater than 1 that has no positive divisors other than 1 and itself.

**Example:**
- is_prime(7) should return True
- is_prime(10) should return False`,
        language: 'python',
        starterCode: `def is_prime(n):
    # Write your code here
    return False`,
        solution: `def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            return False
    return True`,
        testCases: [
          {
            input: '7',
            expectedOutput: 'True',
            isHidden: false,
            points: 5,
          },
          {
            input: '10',
            expectedOutput: 'False',
            isHidden: false,
            points: 5,
          },
          {
            input: '17',
            expectedOutput: 'True',
            isHidden: true,
            points: 10,
          },
        ],
        constraints: ['n will be a positive integer', 'Check divisors up to sqrt(n)'],
        hints: ['Check if n is divisible by any number from 2 to sqrt(n)', 'Handle edge cases (n < 2)'],
        difficulty: 'medium',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      // ========== JAVA LABS ==========
      {
        title: 'Hello World in Java',
        description: 'Write a simple Java program that prints "Hello, World!" to the console.',
        problemStatement: `Write a Java program that prints "Hello, World!" to the console.

**Requirements:**
- Use System.out.println() to print the message
- The output should be exactly: Hello, World!`,
        language: 'java',
        starterCode: `public class Main {
    public static void main(String[] args) {
        // Write your code here
        System.out.println("Hello, World!");
    }
}`,
        solution: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'Hello, World!',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Output must match exactly'],
        hints: ['Use System.out.println()'],
        difficulty: 'easy',
        points: 10,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Sum Array Elements in Java',
        description: 'Write a method that calculates the sum of all elements in an array.',
        problemStatement: `Write a Java method called \`sumArray\` that takes an array of integers and returns the sum of all elements.

**Example:**
- sumArray([1, 2, 3, 4]) should return 10
- sumArray([5, -5, 10]) should return 10`,
        language: 'java',
        starterCode: `public class Main {
    public static int sumArray(int[] arr) {
        // Write your code here
        return 0;
    }
    
    public static void main(String[] args) {
        // Test your function
        int[] arr = {1, 2, 3, 4};
        System.out.println(sumArray(arr));
    }
}`,
        solution: `public class Main {
    public static int sumArray(int[] arr) {
        int sum = 0;
        for (int num : arr) {
            sum += num;
        }
        return sum;
    }
    
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4};
        System.out.println(sumArray(arr));
    }
}`,
        testCases: [
          {
            input: '[1,2,3,4]',
            expectedOutput: '10',
            isHidden: false,
            points: 5,
          },
          {
            input: '[5,-5,10]',
            expectedOutput: '10',
            isHidden: false,
            points: 5,
          },
          {
            input: '[10,20,30]',
            expectedOutput: '60',
            isHidden: true,
            points: 10,
          },
        ],
        constraints: ['Array will contain at least one element', 'Must handle negative numbers'],
        hints: ['Use a for loop or enhanced for loop', 'Initialize sum to 0'],
        difficulty: 'easy',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      // ========== C++ LABS ==========
      {
        title: 'Hello World in C++',
        description: 'Write a simple C++ program that prints "Hello, World!" to the console.',
        problemStatement: `Write a C++ program that prints "Hello, World!" to the console.

**Requirements:**
- Use cout to print the message
- Include necessary headers
- The output should be exactly: Hello, World!`,
        language: 'cpp',
        starterCode: `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    cout << "Hello, World!" << endl;
    return 0;
}`,
        solution: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'Hello, World!',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Output must match exactly'],
        hints: ['Use cout and endl', 'Include iostream header'],
        difficulty: 'easy',
        points: 10,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Find Maximum in C++',
        description: 'Write a function that finds the maximum of two numbers.',
        problemStatement: `Write a C++ function called \`max\` that takes two integers and returns the maximum value.

**Example:**
- max(5, 10) should return 10
- max(-5, -10) should return -5`,
        language: 'cpp',
        starterCode: `#include <iostream>
using namespace std;

int max(int a, int b) {
    // Write your code here
    return 0;
}

int main() {
    // Test your function
    cout << max(5, 10) << endl;
    return 0;
}`,
        solution: `#include <iostream>
using namespace std;

int max(int a, int b) {
    return (a > b) ? a : b;
}

int main() {
    cout << max(5, 10) << endl;
    return 0;
}`,
        testCases: [
          {
            input: '5,10',
            expectedOutput: '10',
            isHidden: false,
            points: 5,
          },
          {
            input: '-5,-10',
            expectedOutput: '-5',
            isHidden: false,
            points: 5,
          },
          {
            input: '15,8',
            expectedOutput: '15',
            isHidden: true,
            points: 10,
          },
        ],
        constraints: ['Must handle negative numbers'],
        hints: ['Use conditional operator or if-else', 'Compare a and b'],
        difficulty: 'easy',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      // ========== C LABS ==========
      {
        title: 'Hello World in C',
        description: 'Write a simple C program that prints "Hello, World!" to the console.',
        problemStatement: `Write a C program that prints "Hello, World!" to the console.

**Requirements:**
- Use printf() to print the message
- Include stdio.h header
- The output should be exactly: Hello, World!`,
        language: 'c',
        starterCode: `#include <stdio.h>

int main() {
    // Write your code here
    printf("Hello, World!\\n");
    return 0;
}`,
        solution: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'Hello, World!',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Output must match exactly'],
        hints: ['Use printf() function', 'Include stdio.h header'],
        difficulty: 'easy',
        points: 10,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Calculate Sum in C',
        description: 'Write a function that calculates the sum of two numbers.',
        problemStatement: `Write a C function called \`add\` that takes two integers and returns their sum.

**Example:**
- add(5, 3) should return 8
- add(-1, 1) should return 0`,
        language: 'c',
        starterCode: `#include <stdio.h>

int add(int a, int b) {
    // Write your code here
    return 0;
}

int main() {
    // Test your function
    printf("%d\\n", add(5, 3));
    return 0;
}`,
        solution: `#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    printf("%d\\n", add(5, 3));
    return 0;
}`,
        testCases: [
          {
            input: '5,3',
            expectedOutput: '8',
            isHidden: false,
            points: 5,
          },
          {
            input: '-1,1',
            expectedOutput: '0',
            isHidden: false,
            points: 5,
          },
          {
            input: '10,20',
            expectedOutput: '30',
            isHidden: true,
            points: 10,
          },
        ],
        constraints: ['Must handle negative numbers'],
        hints: ['Use the + operator', 'Return the result'],
        difficulty: 'easy',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      // ========== HTML LABS ==========
      {
        title: 'Create a Basic HTML Page',
        description: 'Create a simple HTML page with a heading and paragraph.',
        problemStatement: `Create a complete HTML page with:
- A title "My First Page" in the <title> tag
- An <h1> heading that says "Welcome to HTML"
- A <p> paragraph that says "This is my first HTML page."

**Requirements:**
- Include proper HTML structure (html, head, body tags)
- The page should be valid HTML`,
        language: 'html',
        starterCode: `<!DOCTYPE html>
<html>
<head>
    <title>My First Page</title>
</head>
<body>
    <!-- Write your code here -->
</body>
</html>`,
        solution: `<!DOCTYPE html>
<html>
<head>
    <title>My First Page</title>
</head>
<body>
    <h1>Welcome to HTML</h1>
    <p>This is my first HTML page.</p>
</body>
</html>`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'Welcome to HTML',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Must include proper HTML structure', 'Use semantic HTML tags'],
        hints: ['Use <h1> for heading', 'Use <p> for paragraph'],
        difficulty: 'easy',
        points: 10,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Create HTML Form',
        description: 'Create an HTML form with name and email fields.',
        problemStatement: `Create an HTML form with:
- A text input for "Name" with placeholder "Enter your name"
- An email input for "Email" with placeholder "Enter your email"
- A submit button with text "Submit"

**Requirements:**
- Use proper form structure
- Include labels for accessibility`,
        language: 'html',
        starterCode: `<!DOCTYPE html>
<html>
<head>
    <title>Contact Form</title>
</head>
<body>
    <!-- Write your form here -->
</body>
</html>`,
        solution: `<!DOCTYPE html>
<html>
<head>
    <title>Contact Form</title>
</head>
<body>
    <form>
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" placeholder="Enter your name" required>
        <br><br>
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" placeholder="Enter your email" required>
        <br><br>
        <button type="submit">Submit</button>
    </form>
</body>
</html>`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'Name:',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Must include form, input, and button elements', 'Use proper input types'],
        hints: ['Use <form> tag', 'Use <input> with type="text" and type="email"', 'Use <button> for submit'],
        difficulty: 'medium',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      // ========== CSS LABS ==========
      {
        title: 'Style a Heading with CSS',
        description: 'Create CSS to style an h1 heading with blue color and center alignment.',
        problemStatement: `Create CSS that styles an h1 element to:
- Have blue color (#0066cc)
- Be centered (text-align: center)
- Have a font size of 32px

**Requirements:**
- Include the HTML structure with the h1 element
- Add CSS either inline, in <style> tag, or external stylesheet`,
        language: 'css',
        starterCode: `<!DOCTYPE html>
<html>
<head>
    <style>
        /* Write your CSS here */
    </style>
</head>
<body>
    <h1>Styled Heading</h1>
</body>
</html>`,
        solution: `<!DOCTYPE html>
<html>
<head>
    <style>
        h1 {
            color: #0066cc;
            text-align: center;
            font-size: 32px;
        }
    </style>
</head>
<body>
    <h1>Styled Heading</h1>
</body>
</html>`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'Styled Heading',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Must use CSS selectors', 'Apply all three styles'],
        hints: ['Use h1 selector', 'Use color, text-align, and font-size properties'],
        difficulty: 'easy',
        points: 10,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Create a Flexbox Layout',
        description: 'Use CSS Flexbox to create a horizontal layout with three boxes.',
        problemStatement: `Create a CSS Flexbox layout with:
- A container div with class "container"
- Three child divs with class "box"
- The container should use flexbox
- Boxes should be evenly spaced
- Each box should have a background color (red, green, blue)

**Requirements:**
- Use display: flex
- Use justify-content: space-between or space-around`,
        language: 'css',
        starterCode: `<!DOCTYPE html>
<html>
<head>
    <style>
        /* Write your CSS here */
    </style>
</head>
<body>
    <div class="container">
        <div class="box">Box 1</div>
        <div class="box">Box 2</div>
        <div class="box">Box 3</div>
    </div>
</body>
</html>`,
        solution: `<!DOCTYPE html>
<html>
<head>
    <style>
        .container {
            display: flex;
            justify-content: space-between;
        }
        .box {
            padding: 20px;
            margin: 10px;
        }
        .box:nth-child(1) {
            background-color: red;
        }
        .box:nth-child(2) {
            background-color: green;
        }
        .box:nth-child(3) {
            background-color: blue;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="box">Box 1</div>
        <div class="box">Box 2</div>
        <div class="box">Box 3</div>
    </div>
</body>
</html>`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'Box 1',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Must use flexbox', 'Boxes should be horizontally arranged'],
        hints: ['Use display: flex', 'Use justify-content for spacing', 'Use nth-child for different colors'],
        difficulty: 'medium',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      // ========== SQL LABS ==========
      {
        title: 'Select All Records',
        description: 'Write a SQL query to select all records from a table.',
        problemStatement: `Write a SQL query to select all columns and all records from a table called "users".

**Requirements:**
- Use SELECT statement
- Select all columns using *`,
        language: 'sql',
        starterCode: `-- Write your SQL query here
`,
        solution: `SELECT * FROM users;`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'id',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Must use SELECT statement', 'Must select all columns'],
        hints: ['Use SELECT * FROM table_name'],
        difficulty: 'easy',
        points: 10,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Filter Records with WHERE',
        description: 'Write a SQL query to select records where age is greater than 18.',
        problemStatement: `Write a SQL query to select all columns from the "users" table where the "age" column is greater than 18.

**Requirements:**
- Use SELECT statement
- Use WHERE clause
- Filter by age > 18`,
        language: 'sql',
        starterCode: `-- Write your SQL query here
`,
        solution: `SELECT * FROM users WHERE age > 18;`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'id',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Must use WHERE clause', 'Must use comparison operator >'],
        hints: ['Use SELECT * FROM table_name WHERE condition', 'Use > operator for comparison'],
        difficulty: 'easy',
        points: 10,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
      {
        title: 'Join Two Tables',
        description: 'Write a SQL query to join users and orders tables.',
        problemStatement: `Write a SQL query to select user names and their order IDs by joining the "users" and "orders" tables.

Assume:
- users table has columns: id, name, email
- orders table has columns: id, user_id, order_date

**Requirements:**
- Use INNER JOIN
- Select name from users and id from orders`,
        language: 'sql',
        starterCode: `-- Write your SQL query here
`,
        solution: `SELECT users.name, orders.id 
FROM users 
INNER JOIN orders ON users.id = orders.user_id;`,
        testCases: [
          {
            input: ' ',
            expectedOutput: 'name',
            isHidden: false,
            points: 10,
          },
        ],
        constraints: ['Must use INNER JOIN', 'Must join on correct columns'],
        hints: ['Use INNER JOIN syntax', 'Join on users.id = orders.user_id'],
        difficulty: 'medium',
        points: 20,
        status: 'published',
        createdBy: user._id,
        organization: org._id,
      },
    ];

    const createdLabs = await CodingLab.insertMany(codingLabs);

    console.log('========================================');
    console.log('✅ Successfully created coding labs!');
    console.log('========================================\n');
    console.log(`Created ${createdLabs.length} coding labs across all languages:\n`);
    
    // Group labs by language
    const labsByLanguage = {};
    createdLabs.forEach((lab) => {
      if (!labsByLanguage[lab.language]) {
        labsByLanguage[lab.language] = [];
      }
      labsByLanguage[lab.language].push(lab);
    });
    
    // Display labs grouped by language
    Object.keys(labsByLanguage).sort().forEach((language) => {
      console.log(`\n📚 ${language.toUpperCase()} (${labsByLanguage[language].length} labs):`);
      labsByLanguage[language].forEach((lab, index) => {
        console.log(`   ${index + 1}. ${lab.title} (${lab.difficulty}) - ${lab.points} points`);
      });
    });
    
    console.log('\n========================================');
    console.log('Next Steps:');
    console.log('========================================');
    console.log('1. Refresh your coding labs page in the browser');
    console.log(`2. You should see ${createdLabs.length} coding labs across all languages`);
    console.log('3. Filter by language to see labs for specific languages');
    console.log('4. Click on any lab to start coding!');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding coding labs:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure MongoDB is running');
    console.error('2. Check your MONGODB_URI in .env file');
    console.error('3. Verify network connectivity');
    console.error('4. Check backend logs for more details\n');
    process.exit(1);
  }
};

seedCodingLabs();

