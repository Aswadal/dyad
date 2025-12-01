// Serverless function for real terminal execution
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Safe commands whitelist
const SAFE_COMMANDS = [
    'ls', 'pwd', 'whoami', 'date', 'echo',
    'cat', 'head', 'tail', 'wc', 'grep',
    'find', 'mkdir', 'rmdir', 'touch'
];

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { command } = JSON.parse(event.body);
        
        if (!command || typeof command !== 'string') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No command provided' })
            };
        }
        
        // Security check: only allow whitelisted commands
        const baseCommand = command.split(' ')[0];
        if (!SAFE_COMMANDS.includes(baseCommand)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ 
                    error: 'Command not allowed',
                    allowed: SAFE_COMMANDS 
                })
            };
        }
        
        // Timeout after 10 seconds
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Command timeout')), 10000);
        });
        
        // Execute command
        const execPromise = execAsync(command, {
            cwd: '/tmp',
            env: { ...process.env, PATH: process.env.PATH },
            shell: '/bin/bash'
        });
        
        const result = await Promise.race([execPromise, timeoutPromise]);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                output: result.stdout,
                error: result.stderr,
                exitCode: 0
            })
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message,
                note: 'Running in demo mode. Add more commands to SAFE_COMMANDS array.'
            })
        };
    }
};
