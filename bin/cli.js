const { program } = require("commander");
const update = require("./update.js");
const install = require("./install.js");

program
	.command("install")
	.description("Setup Cotta instance interactively")
	.action(() => {
		install();
	});

program
	.command("update")
	.description("Update Cotta version")
	.action(() => {
		update();
	});

program.parse(process.argv);