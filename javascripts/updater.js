/* eslint-disable no-console */

/* NOTE(adam):
  Purpose: generate a list of repos with gh-pages
  - Authentication needed due to number of api requests
  - Get my access token from a local file to keep it out of github
  - Request the data for all repos
  - For each repo, request the data for all branches
  - If a branch is named "gh-pages", add the repo to an array
  - Map the array to more compact data
  - Write json file that live page can read
*/

(function() {
  "use strict";
  const fs = require("fs");
  const https = require("https");

  const requestData = {client_id: "aoswalt", access_token: ""};
  const options = {
    hostname: "api.github.com",
    path: "/users/aoswalt/repos", //?client_id=aoswalt&access_token="
    headers: { "User-Agent": "javascript" },
    json: true
  };

  //NOTE(adam): get access token from file
  function fetchToken() {
    return new Promise(function(resolve, reject) {
      fs.readFile("data/access.token", (err, data) => {
        if(err) {
          reject(err);
          return;
        }
        resolve(data.toString().trim());
      });
    });
  }

  //NOTE(adam): get data of all public repos
  function fetchRepos() {
    return new Promise((resolve, reject) => {
      options.path = "/users/aoswalt/repos";
      options.pah += `?client_id=${requestData.client_id}&access_token=${requestData.access_token}`;

      https.get(options, function(response) {
        if(response.statusCode !== 200) { reject(response); }   //eslint-disable-line no-magic-numbers
        const data = [];
        response.on("data", chunk => data.push(chunk));
        response.on("end", () => resolve(JSON.parse(data.join(""))));
        response.on("error", err => reject(err));
      });
    });
  }

  //NOTE(adam): get data for all branches from repo url
  function fetchBranches(repo) {
    return new Promise((resolve, reject) => {
      //NOTE(adam): branches_url must be trimmed and ends with {/branch}
      options.path = repo.branches_url
        .replace(/{.+}/, "")
        .replace("https://", "")
        .replace(options.hostname, "");
      options.path += `?client_id=${requestData.client_id}&access_token=${requestData.access_token}`;

      https.get(options, function(response) {
        if(response.statusCode !== 200) { reject(response); }   //eslint-disable-line no-magic-numbers

        const rawData = [];
        response.on("data", chunk => rawData.push(chunk));
        response.on("end", () => {
          //NOTE(adam): if a repo has a gh-pages branch, resolve the data, otherwise null
          const data = JSON.parse(rawData.join(""));
          const isPages = data.filter(b => b.name === "gh-pages").length > 0;
          resolve(isPages ? repo : null);
        });
        response.on("error", err => reject(err));
      });
    });
  }

  //NOTE(adam): run to fetch and write data
  fetchToken().then(function(token) {
    requestData.access_token = token;
    return fetchRepos();
  }).then(function(repoArray) {
    const repoPromises = [];
    repoArray.forEach(function(repo) {
      repoPromises.push(fetchBranches(repo));
    });

    Promise.all(repoPromises).then(function(values) {
      //NOTE(adam): trim nulls from repos with no gh-pages
      const pagesRepos = values.filter(e => e !== null);
      fs.writeFile("data/fullData.json", JSON.stringify({repos: pagesRepos}));
      fs.writeFile("data/repos.json", JSON.stringify({
        //NOTE(adam): write simplified data
        repos: pagesRepos.map(e => ({
          urlPart: e.name,
          //NOTE(adam): temporary quick and dirty title
          title: e.name.replace(/-/g, " ").replace(/\b\w/g, s => s.toUpperCase())
        }))
      }));
    }).catch(console.error);
  });

}());
