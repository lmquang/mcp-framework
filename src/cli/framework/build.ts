#!/usr/bin/env node
import { execa } from "execa";
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { findUp } from 'find-up';

export async function buildFramework() {
    process.stderr.write("MCP Build Script Starting...\n");
    process.stderr.write("Finding project root...\n");
    
    const startDir = process.cwd();
    process.stderr.write(`Starting search from: ${startDir}\n`);
    
    const skipValidation = process.env.MCP_SKIP_VALIDATION === 'true';
    if (skipValidation) {
        process.stderr.write(`Skipping dependency validation\n`);
    }
    
    try {
        const pkgPath = await findUp('package.json');
        if (!pkgPath) {
            throw new Error("Could not find package.json in current directory or any parent directories");
        }
        
        const projectRoot = dirname(pkgPath);
        
        if (!skipValidation) {
            const pkgContent = await readFile(pkgPath, 'utf8');
            const pkg = JSON.parse(pkgContent);
            
            if (!pkg.dependencies?.["mcp-framework"]) {
                throw new Error("This directory is not an MCP project (mcp-framework not found in dependencies)");
            }
        }
        
        process.stderr.write(`Running tsc in ${projectRoot}\n`);
        
        const tscCommand = process.platform === 'win32' ? ['npx.cmd', 'tsc'] : ['npx', 'tsc'];
            
        await execa(tscCommand[0], [tscCommand[1]], {
            cwd: projectRoot,
            stdio: "inherit",
            env: {
                ...process.env,
                ELECTRON_RUN_AS_NODE: "1",
                FORCE_COLOR: "1"
            }
        });

        const distPath = join(projectRoot, "dist");
        const projectIndexPath = join(distPath, "index.js");
        const shebang = "#!/usr/bin/env node\n";
        
        process.stderr.write("Adding shebang to index.js...\n");
        try {
            const content = await readFile(projectIndexPath, "utf8");
            if (!content.startsWith(shebang)) {
                await writeFile(projectIndexPath, shebang + content);
            }
        } catch (error) {
            process.stderr.write(`Error processing index.js: ${error instanceof Error ? error.message : String(error)}\n`);
            throw error;
        }

        process.stderr.write("Build completed successfully!\n");
    } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    }
}

export default buildFramework;
