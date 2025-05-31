module.exports = {
	  apps: [
    {
	name: 'sp3-PB-client',
	script: 'npm',
	args: 'run start',
	cwd: './',
	instances: 1, 
	autorestart: true,
	watch: false,
	max_memory_restart: '1G',
	env: {

	},
	env_production: {
		NODE_ENV: 'production',
		PORT: 3000,
    },
   },
  ],
};
