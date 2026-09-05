module.exports = {
  apps: [
    {
      name: "whatsapp-broadcast",
      script: "dist/index.cjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      // With the BullMQ queue, heap should stay flat; keep a safety net.
      max_memory_restart: "500M",
      autorestart: true,
      watch: false,
    },
  ],
};
