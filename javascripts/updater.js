/* jshint camelcase:false */

(function() {
  "use strict";

  let requestData = {client_id: "aoswalt", access_token: ""};

  function fetchToken() {
    return new Promise(function(resolve, reject) {
      $.ajax("/data/access.token")
        .done(token => resolve(token))
        .fail((x,s,e) => reject(e));
    });
  }

  function fetchRepos() {
    return new Promise(function(resolve, reject) {
      $.ajax({
        url: "https://api.github.com/users/aoswalt/repos",
        data: requestData
      }).done(function(repoArray) {
        resolve(repoArray);
      }).fail((x,s,e) => reject(e));
    });
  }

  function fetchBranches(repo) {
    return new Promise(function(resolve, reject) {
      //NOTE(adam): branches_url ends with {/branch}
      var repoUrl = repo.branches_url.replace(/{.+}/, "");
      $.ajax({
        url: repoUrl,
        data: requestData
      }).done(function(branchArray) {
        //NOTE(adam): determine if there is a branch named "gh-pages"
        var isPages = branchArray.filter(b => b.name === "gh-pages").length > 0;
        resolve(isPages ? repo : null);
      }).fail((x,s,e) => reject(e));
    });
  }

  //TODO(adam): get non-owned repos
  fetchToken().then(function(token) {
    requestData.access_token = token.trim();
    return fetchRepos();
  }).then(function(repoArray) {
    let repoPromises = [];

    repoArray.forEach(function(repo) {
      repoPromises.push(fetchBranches(repo));
    });

    Promise.all(repoPromises).then(function(values) {
      console.log("values", values.filter(e => e !== null));
    });
  });

}());
