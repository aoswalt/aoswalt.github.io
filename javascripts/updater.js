(function() {
  "use strict";
  const fs = require("fs");
  const https = require("https");

  const requestData = {client_id: "aoswalt", access_token: ""};
  const options = {
    hostname: "api.github.com",
    path: "/users/aoswalt/repos", //?client_id=aoswalt&access_token=",   //+token
    headers: { "User-Agent": "javascript" },
    json: true
  };

  function fetchToken() {
    return new Promise(function(resolve, reject) {
      fs.readFile("data/access.token", function(err, data) {
        if(err) {
          reject(err);
          return;
        }
        resolve(data.toString().trim());
      });
    });
  }

  function fetchRepos() {
    return new Promise(function(resolve, reject) {
      options.path = "/users/aoswalt/repos";
      options.pah += `?client_id={requestData.client_id}&access_token={requestData.access_token}`;

      https.get(options, function(response) {
        if(response.statusCode !== 200) { reject(response); }   //eslint-disable-line no-magic-numbers
        const data = [];
        response.on("data", chunk => data.push(chunk));
        response.on("end", () => resolve(JSON.parse(data.join(""))));
        response.on("error", err => reject(err));
      });
    });
  }

  function fetchBranches(repo) {
    return new Promise(function(resolve, reject) {
      //NOTE(adam): branches_url ends with {/branch}
      let repoUrl = repo.branches_url.replace(/{.+}/, "");
      repoUrl = repoUrl.replace("https://", "");
      options.path = repoUrl.replace(options.hostname, "");
      options.path += `?client_id=${requestData.client_id}&access_token=${requestData.access_token}`;

      https.get(options, function(response) {
        if(response.statusCode !== 200) { reject(response); }   //eslint-disable-line no-magic-numbers
        const data = [];
        response.on("data", chunk => data.push(chunk));
        response.on("end", () => {
          const isPages = JSON.parse(data.toString()).filter(b => b.name === "gh-pages").length > 0;
          resolve(isPages ? repo : null);
        });
        response.on("error", err => reject(err));
      });
    });
  }

  fetchToken().then(function(token) {
    requestData.access_token = token;

    return fetchRepos();
  }).then(function(repoArray) {
    const repoPromises = [];
    repoArray.forEach(function(repo) {
      repoPromises.push(fetchBranches(repo));
    });

    Promise.all(repoPromises).then(function(values) {
      const pagesRepos = values.filter(e => e !== null);
      fs.writeFile("data/fullData.json", JSON.stringify({repos: pagesRepos}));
      fs.writeFile("data/repos.json", JSON.stringify({repos:
        pagesRepos.map(e => {
          return {urlPart: e.name};
        })
      }));

      // let stream = fs.createWriteStream("../data/repos.json");
      // response.on("data", data => stream.write(data));
      // response.on("end", () => stream.end());
    }).catch(console.error);
  });

}());
