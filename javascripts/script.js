"use strict";

$.ajax("data/repos.json")
.done(data => {
  data.repos.forEach(r => {
    $(".links").append(`<p><a href="https://aoswalt.github.io/${r.urlPart}">${r.urlPart}</a></p>`);
  });
});
