// This function exists to force the evaluation of modules that might not get loaded during
// the normal flow of your application and thus would not show up in the coverage report. This is needed
// because the istanbul plugin simply traverses a file and inserts counters over all lines of code
// such as: (the following is sudo code that is not exactly correct but illustrates that point)
//
// define('my-app/foo', function() {
//   window.counter++;
//   return 'bar';
// });
//
// This counter will never happen unless this module gets evaluated and if you do not "pull" on this
// module from somewhere it will be as if it doesnt exists from the code coverage point of view. This
// file will makes sure all modules (including those from webpack where Emboider will place some) get
// evaluated by actually requiring them.
//
//
export async function forceModulesToBeLoaded(filterFunction) {
  if (!filterFunction) {
    filterFunction = (_type, modulePath) => {
      const excludeTestModules = /^[^/]+\/tests\//;
      return !excludeTestModules.test(modulePath);
    };
  }

  const entries = Object.entries(modules).filter(([path]) =>
    filterFunction('vite', path),
  );

  await Promise.all(
    entries.map(async ([path, importModule]) => {
      try {
        await importModule();
      } catch (error) {
        console.warn(
          `Error occurred while evaluating '${path}': ${error.message}\n${error.stack}`,
        );
      }
    }),
  );
}

export async function sendCoverage(callback) {
  let coverageData = window.__coverage__; //eslint-disable-line no-undef

  if (coverageData === undefined) {
    if (callback) {
      callback();
    }

    return; // do nothing if there is no coverage data
  }

  let body = JSON.stringify(coverageData || {});

  let response = await fetch('/write-coverage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
  let responseData = await response.json();
  writeCoverageInfo(responseData);

  if (callback) {
    callback();
  }

  return responseData;
}

function writeCoverageInfo(data) {
  if (data) {
    let results = ['Lines', 'Branches', 'Functions', 'Statements']
      .filter((name) => name.toLowerCase())
      .map((name) => name + ' ' + data[name.toLowerCase()].pct + '%');

    //eslint-disable-next-line no-undef
    let resultsText = document.createTextNode(results.join(' | '));
    //eslint-disable-next-line no-undef
    let element = document.createElement('div');
    element.style =
      'background-color: white; color: black; border: 2px solid black; padding: 1em;position: fixed; left: 15px; bottom: 15px';
    element.appendChild(resultsText);
    //eslint-disable-next-line no-undef
    document.body.appendChild(element);
  }
}
