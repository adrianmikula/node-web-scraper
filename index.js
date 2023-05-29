// Import dependencies
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const async = require('async');
const cron = require('node-cron');
const fs = require('fs');
const { promisify } = require('util');

// Load the configuration from config.json
const config = require('./config.json');


// Create an Express app
const app = express();

// Define a route for scraping
app.get('/scrape', (req, res) => {
  scrapeAndSaveData();
  res.send('Scraping started.');
});

// Function to scrape and save data
async function scrapeAndSaveData() {
    try {
      await async.eachSeries(config.urls, async (urlConfig) => {
        try
        {
            const response = await axios.get(urlConfig.url);
            const $ = cheerio.load(response.data);
    
            const extractedData = {};
            urlConfig.elements.forEach(element => {
                console.log('Scraping ' + urlConfig.url.substring(0, 100));
            //extractedData[element.name] = $(element.selector).text().trim();

            //console.log("including child text " + urlConfig.includeChildText)

            const rows = $(urlConfig.wrapper).find(urlConfig.rowWrapper); 
                const rowData = [];
                rows.each((index, row) => {

                    let rowDataItem = ''
                    if (urlConfig.includeChildText)
                    {
                      
                        rowDataItem = $(row).find(element.selector).contents().map((_, child) => {
                            if (child.type === 'text') {
                              return $(child).text().trim();
                            }
                          }).get().join(' ');
                    }
                    else
                    {
                        rowDataItem = $(row).find(element.selector).text().trim();
                    }
                    rowData.push(rowDataItem);
                });
                extractedData[element.name] = rowData;
                console.log('Scraped ' + urlConfig.url.substring(0, 100));
            });

            await saveData(extractedData, urlConfig.url);
        }
        catch (error)
        {
            console.error('An error occurred while scraping ' + urlConfig.url.substring(0, 100) + ':', error.message);
            console.log(error.stack)
        }
      });
  
      console.log('Scraping completed successfully.');
    } catch (error) {
      console.error('An error occurred while scraping:', error.message);
      console.log(error.stack)
    }
  }

// Function to save the extracted data to the output file
// async function saveData(data, url) {
//     let writeFileAsync = promisify(fs.writeFile);
//     let lockFileAsync = promisify(fs.lock);
  
//     let outputData = {};
  
//     try {
//       const lock = await lockFileAsync(config.outputFile + '.lock', { retries: 10 });
  
//       const fileData = await promisify(fs.readFile)(config.outputFile, 'utf8');
//       if (fileData) {
//         outputData = JSON.parse(fileData);
//       }
  
//       if (config.splitByURL) {
//         const filename = url.replace(/[^a-z0-9]/gi, '_') + '.json';
//         const filePath = config.outputFolder ? config.outputFolder + '/' + filename : filename;
  
//         outputData[url] = data;
  
//         await writeFileAsync(filePath, JSON.stringify(data, null, 2), 'utf8');
//       } else {
//         outputData = { ...outputData, ...data };
//         await writeFileAsync(config.outputFile, JSON.stringify(outputData, null, 2), 'utf8');
//       }
  
//       lock.release();
//       console.log('Data saved successfully.');
//     } catch (error) {
//       console.error('Error saving data:', error.message);
//       console.log(error.stack)
//     }
//   }


// Function to save the extracted data to the output file
function saveData(data, url) {
    return new Promise((resolve, reject) => {
      let outputData = {};
  
      const filePath = config.splitByURL
        ? `${config.outputFolder}/${url.replace(/[^a-z0-9]/gi, '_')}.json`
        : config.outputFile;
  
      fs.readFile(filePath, 'utf8', (readErr, fileData) => {
        if (readErr && readErr.code !== 'ENOENT') {
          return reject(readErr);
        }
  
        if (fileData) {
          outputData = JSON.parse(fileData);
        }
  
        if (config.splitByURL) {
          outputData[url] = data;
        } else {
          Object.assign(outputData, data);
        }
  
        fs.writeFile(filePath, JSON.stringify(outputData, null, 2), 'utf8', (writeErr) => {
          if (writeErr) {
            return reject(writeErr);
          }
  
          console.log(`Data saved successfully to ${filePath}`);
          resolve();
        });
      });
    });
  }

// Schedule scraping at regular intervals using cron
const schedule = '0 * * * *'; // Run every hour
cron.schedule(schedule, () => {
  scrapeAndSaveData();
});

// Start the server
const port = 3000; // Replace with the desired port number
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});