
// ==UserScript==
// @name         Bin Tracker
// @namespace    id-install
// @version      v1.1
// @description  Extract bin location and display parts count
// @author       @misimsr aka Yung Denzel
// @icon         https://liquipedia.net/commons/images/c/c4/OpTic_Gaming_darkmode.png
// @noframes
// @match        https://mobility.amazon.com*
// @match        https://mobility.amazon.com/*
// @match        https://prod.us-east-1.mobility.scm.aws.dev/*
// @match        https://t.corp.amazon.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function(){
    'use strict';

    const getLocation = () => {
        const loc = window.location;

        if (/us\-east\-1\.mobility\.scm\.aws\.dev/.test(loc)){
            return 'prod.us-east-1.mobility.scm.aws.dev';
        }
        else {
            return 'mobility.amazon.com'
        }
    }

    const PAGE_LOCATION = getLocation();

    const TOOL_VERSION = GM_info.script.version;

    const wait = (ms) => { return new Promise(resolve => setTimeout(resolve,ms))}

    const xhr = (url,timeout,opt={}) => {
        Object.assign(opt, {
            url,
            timeout: timeout,
            fetch: 'fetch',
            method: 'GET'
        });
        return new Promise((resolve,reject) => {
            opt.onerror = opt.ontimeout = reject;
            opt.onload = resolve;
            GM_xmlhttpRequest(opt);
        });
    }

    const request = async (url, delay = 1500, retries = 3, fetchOptions = {}) => {
        let timeout = 15000;
        let attempts = 0;
        while (true) {
            try {
                const result = await xhr(url,timeout,fetchOptions);
                return result;
            }
            catch(e) {
                if (++attempts >= retries) { return }
                timeout += 1000;
            }
            await wait(delay);
        }
    }


    const extractBinLocation = () => {

        const searchInput = document.querySelector('input[name="search_string"]');
        if (searchInput && searchInput.value) {
            const searchValue = searchInput.value.trim();
            const binPattern = /^([A-Z0-9]+)\.([A-Z0-9_]+)\.([A-Z0-9_]+)$/i;
            const match = searchValue.match(binPattern);

            if (match) {
                return {
                    full: searchValue,
                    site: match[1],
                    room: match[2],
                    bin: match[3]
                };
            }
        }

        return null;
    }


    const getPartsCount = async (binLocation) => {
        const apiUrl = `https://mobility-search.amazon.com/solr/assets/select/`;

        const params = new URLSearchParams({
            q: `site:${binLocation.site} AND room:${binLocation.room} AND bin:${binLocation.bin}`,
            wt: 'json',
            rows: 0
        });

        try {
            const response = await request(`${apiUrl}?${params.toString()}`);
            const data = JSON.parse(response.responseText);
            return data.response.numFound || 0;
        } catch (error) {
            console.error('Error fetching parts count:', error);
            return null;
        }
    }


    const updateDisplay = (binLocation, partsCount) => {
        const binTrackerBox = document.getElementById('bin-tracker-box');
        if (!binTrackerBox) return;

        if (binLocation && partsCount !== null) {

            const binSearchUrl = `https://${PAGE_LOCATION}/part/search?search_type=all&search_string=site:${binLocation.site}%20AND%20room:${binLocation.room}%20AND%20bin:${binLocation.bin}&max_rows=50&query=GO`;

            if (partsCount <= 500) {

                alert(`LOW PARTS COUNT for ${binLocation.full}`);


                binTrackerBox.innerHTML = `
                    <div style="font-size: 12px; line-height: 1.4;">
                        <div style="color: #ff9900;">Bin: ${binLocation.full}</div>
                        <div style="color: #fff;">Parts: ${partsCount}</div>
                        <div style="color: #ff6b6b; font-weight: bold;">⚠️ LOW COUNT</div>
                        <div style="margin-top: 5px;">
                            <a href="https://t.corp.amazon.com/create/templates/294727e0-09e8-4189-ad5f-3ddd066b74dc"
                            target="_blank"
                            style="color: #ff9900; text-decoration: none; font-size: 11px;">
                                📋 Create SIM Ticket
                            </a>
                        </div>
                    </div>
                `;
                binTrackerBox.style.backgroundColor = '#8B0000';

                const simLink = document.getElementById('sim-ticket-link');
                if(simLink){
                   simLink.addEventListener('click', (e) => {
                      e.stopPropagation();
                   });
                }
            } else {

                binTrackerBox.innerHTML = `
                    <div style="font-size: 12px; line-height: 1.4;">
                        <div style="color: #ff9900;">Bin: ${binLocation.full}</div>
                        <div style="color: #fff;">Parts: ${partsCount}</div>
                    </div>
                `;
                binTrackerBox.style.backgroundColor = '#232f3e';
            }
        } else if (binLocation && partsCount === null) {
            const binSearchUrl = `https://${PAGE_LOCATION}/part/search?search_type=all&search_string=site:${binLocation.site}%20AND%20room:${binLocation.room}%20AND%20bin:${binLocation.bin}&max_rows=50&query=GO`;

            binTrackerBox.innerHTML = `
                <div style="font-size: 12px; line-height: 1.4;">
                    <div style="color: #ff9900;">Bin: ${binLocation.full}</div>
                    <div style="color: #ff6b6b;">Error loading count</div>
                </div>
            `;
            binTrackerBox.style.backgroundColor = '#5a3a3a';
        } else {
            binTrackerBox.textContent = 'Enter Info';
            binTrackerBox.style.backgroundColor = '#787272';
        }
    }


    const createElement = () => {
        const li = document.createElement('li');
        const div = document.createElement('div');
        div.setAttribute('id','bin-tracker-box');
        div.style.padding = '0.7rem';
        div.style.fontWeight = 'Bold';
        div.style.fontFamily = 'Arial sans-serif'
        div.style.display = 'block';
        div.style.cursor = 'pointer';
        div.style.marginTop = '5px';
        div.textContent = 'Enter Info';
        div.style.backgroundColor = '#787272';


        div.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
               return;
            }

            const userInput = prompt('BIN NAME (format: SITE.ROOM.BIN):');
            if (userInput !== null && userInput.trim() !== '') {
                console.log('User entered:', userInput);

                const binPattern = /^([A-Z0-9]+)\.([A-Z0-9_]+)\.([A-Z0-9_]+)$/i;
                const match = userInput.trim().match(binPattern);

                if (match) {
                    const binLocation = {
                        full: userInput.trim(),
                        site: match[1],
                        room: match[2],
                        bin: match[3]
                    };

                    saveBin(binLocation);

                    div.textContent = 'Loading...';
                    div.style.backgroundColor = '#4a4a4a';

                    const count = await getPartsCount(binLocation);
                    updateDisplay(binLocation, count);
                } else {
                    alert('Invalid format! Please use SITE.ROOM.BIN format (e.g., SITE.ROOM.BIN)');
                }
            }
        });

        li.append(div);
        const searchBox = document.querySelector('.navbar-search-box');
        if (searchBox && searchBox.parentNode) {
            searchBox.parentNode.insertBefore(li, searchBox);
        }
    }

    const saveBin = (binLocation) => {
       localStorage.setItem('savedBin', JSON.stringify(binLocation));
    }

    const loadSavedBin = () => {
       const saved = localStorage.getItem('savedBin');
       if (saved) {
          try {
             return JSON.parse(saved);
          }
          catch (e) {
             console.error('Error loading saved bin:', e);
             return null;
          }
       }
       return null;
    }

    const clearSavedBin = () => {
       localStorage.removedItem('savedBin');
    }


    const init = async () => {
        createElement();

        let binLocation = loadSavedBin();


        if(!binLocation){
          binLocation = extractBinLocation();
        }

        if (binLocation) {
            console.log('Bin Location Found:', binLocation);
            const count = await getPartsCount(binLocation);
            updateDisplay(binLocation, count);
        }
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})()
