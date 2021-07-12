//
const pm2 = require("pm2");
//

// Start process
console.log(">> Starting Bug-Bot");
pm2.connect((err) => {
    if (err) {
        console.log(err);
        process.exit(2);
    }
    pm2.start({
        script: "./src/bot_client/index.js",
        args: ["--color"],
        name: "Bug-Bot_Client",
        exec_mode: "fork",
        max_memory_restart: "1G",
        cwd: "./",
        error: "./logs/bot_client/error.err",
        output: "./logs/bot_client/output.log",
        pid: "./logs/bot_client/pid.pid",
        node_args: "-r esm",
        autorestart: true,
        wait_ready: true
    },
    (err) => {
        pm2.disconnect();
        if (err) {
            throw err;
        }
    });
});