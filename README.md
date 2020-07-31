# Cotta

Cotta is a Express.js based API creation framework designed to be used by both beginners and advanced users: you can get started easily creating a basic API, while still have access to the knitty gritty details that can help you create a full featured API.

The project is still in development and in currently in alpha. **Do not deploy this in a production server!** I want this to be more fully vetted before recommending it for production use. Any help with this project is extremely welcomed!

Cotta is based on Express.js, using its route definitions and middlewares, Cotta makes creating endpoints for publishing data easy while automatically making those data available through an API. Cotta is meant to be a website or app's back end, although you can serve a static website through it, it is not recommended to render the front end with Cotta. Any front end that goes with Cotta should consume its API (including when serving static websites through Cotta).

[Cotta-admin](https://github.com/limzykenneth/Cotta-admin) is a ready made static frontend admin panel that is ready to use with Cotta, you can use it to set up your API and handle your data.

##### What Cotta is NOT:
- A full-stack framework
- A highly opinionated framework
- Trying to invent new concepts

##### What Cotta is:
- A quick and easy way to setup data structures that will be available through an API
- An Express server (if you know Express, you know Cotta)

## Features
Cotta by default exposes an API under the `/api/` route and whatever is under the `public` directory under the `/` route (where you can put your static site if you wish to serve it with Cotta).

Cotta uses an ORM inspired by Ruby's Active Record called [DynamicRecord](https://dynamic-record.js.org/) that I wrote from scratch. It currently only works with MongoDB but there are plans to support other databases in the future.

Cotta uses a MVC-like structure inspired by [Backbone.js](https://backbonejs.org/). Each piece of data (document in MongoDB, model in Backbone.js) is a model, a set of models are grouped under a collection and a collection are defined by its schema which the models adhere to. There is no view layer.

## Usage
1. Setup a MongoDB database with the approriate user with read/write permission.

1. Download the latest release of Cotta and extract it to where you want it to be.

1. Run `npm install` to install dependencies.

1. Run the install script with `npx cotta install` and follow the prompts to setup your installation.

1. Run `npm start` to start the production server or `npm run server` to run the development servers that automatically restarts the server on file change.

An update script is also available (`bin/update.js`) to update your Cotta version automatically but it is still experimental so use it at your own risk.

More documentation to follow when Cotta reached beta.

## Develop
All contributions, ideas, advice, pull request are all highly valued. Setup for development is the same as for using it, jsut clone the repo instead of downloading the release.

I made Cotta because I couldn't find something that met my needs, namely a framework to fulfill all of the following:
- Arbitrarily define a model's schema without any preconception of what an entry's structure should be
- A friendly but flexible and powerful back end user interface
- An API server
- A user based back end management system
- A framework that doesn't expect me to render my front end on the back end

The aims of Cotta are:
1. To be as easy to use as Wordpress but provide more flexibility out of the box without sacrificing too much of that usability.
2. Must be a [Twelve-Factor App](https://12factor.net/) that doesn't rely on the local file system for any configurations.