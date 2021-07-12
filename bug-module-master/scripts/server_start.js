//
const pm2 = require("pm2");
//

// Start process
console.log(">> Starting Server");
pm2.connect((err) => {
    if (err) {
        console.log(err);
        process.exit(2);
    }
    pm2.start({
        script: "./src/server/app.js",
        args: ["--color"],
        name: "Bug-Report-form_Server",
        exec_mode: "fork",
        max_memory_restart: "1G",
        cwd: "./",
        error: "./logs/server/error.err",
        output: "./logs/server/output.log",
        pid: "./logs/server/pid.pid",
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