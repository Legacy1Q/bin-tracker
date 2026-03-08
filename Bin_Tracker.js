
// ==UserScript==
// @name         Bin Tracker
// @namespace    id-install
// @version      v1.2
// @description  Extract bin location and display parts count
// @author       misimsr, abdelebo (UI Design)
// @icon         https://liquipedia.net/commons/images/c/c4/OpTic_Gaming_darkmode.png
// @downloadURL  https://drive-render.corp.amazon.com/view/misimsr@/Scripts/Bin_Tracker.user.js
// @updateURL    https://drive-render.corp.amazon.com/view/misimsr@/Scripts/Bin_Tracker.user.js
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
                    <div style="font-size: 13px; line-height: 1.6;">
                        <div style="color: #ff9900; font-weight: bold; margin-bottom: 5px;">
                            📦 Bin Tracker
                        </div>

                        <div style="color: #fff; font-size: 11px; margin-bottom: 5px;">
                            ${binLocation.full}
                        </div>

                        <div style="color: #fff; font-size: 14px;">
                            Total:
                            <span id="parts-count-click"
                                style="cursor: pointer; text-decoration: underline; color: #ff9900; font-weight: bold;"
                                title="Click for details">
                                ${partsCount}
                            </span>
                        </div>

                        <div style="color: #ff6b6b; font-weight: bold; margin-top: 5px;">
                            ⚠️ LOW INVENTORY
                        </div>

                        <div style="margin-top: 8px;">
                            <a href="https://t.corp.amazon.com/create/templates/294727e0-09e8-4189-ad5f-3ddd066b74dc"
                            target="_blank"
                            style="color: #ff9900; text-decoration: none; font-size: 11px; font-weight: bold;">
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
                    <div style="font-size: 13px; line-height: 1.6;">
                        <div style="color: #ff9900; font-weight: bold; margin-bottom: 5px;">
                            📦 Bin Tracker
                        </div>

                        <div style="color: #fff; font-size: 11px; margin-bottom: 5px;">
                            ${binLocation.full}
                        </div>

                        <div style="color: #fff; font-size: 14px;">
                            Total:
                            <span id="parts-count-click"
                                style="cursor: pointer; text-decoration: underline; color: #ff9900; font-weight: bold;">
                                ${partsCount}
                            </span>
                        </div>
                    </div>
                `;
                binTrackerBox.style.backgroundColor = '#232f3e';
            }

            const partsCountEl = document.getElementById('parts-count-click');
            if (partsCountEl) {
                partsCountEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showSpeedBreakdown(binLocation);
                });
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

    const getPartsBySpeed = async (binLocation) => {
        const apiUrl = `https://mobility-search.amazon.com/solr/assets/select/`;

        const params = new URLSearchParams({
            q: `site:${binLocation.site} AND room:${binLocation.room} AND bin:${binLocation.bin}`,
            wt: 'json',
            rows: 50000, // fetch up to 1000 parts
            fl: 'model_description' // only fetch the field we need
        });

        try {
            const response = await request(`${apiUrl}?${params.toString()}`);
            const data = JSON.parse(response.responseText);
            const docs = data.response.docs || [];

            const speedCounts = { '400G': 0, '100G': 0, '10G': 0, 'Other': 0 };

            docs.forEach(doc => {
                const desc = (doc.model_description || '').toUpperCase();
                if (desc.includes('400G')) speedCounts['400G']++;
                else if (desc.includes('100G')) speedCounts['100G']++;
                else if (desc.includes('10G')) speedCounts['10G']++;
                else speedCounts['Other']++;
            });

            return speedCounts;
        } catch (error) {
            console.error('Error fetching parts by speed:', error);
            return null;
        }
    }

    const showSpeedBreakdown = async (binLocation) => {
    // Remove existing breakdown if present
        const existing = document.getElementById('speed-breakdown-box');
        if (existing) {
            existing.remove();
            return; // Toggle off if already showing
        }

        const breakdown = document.createElement('div');
        breakdown.setAttribute('id', 'speed-breakdown-box');
        breakdown.style.cssText = `
         position: fixed;
         inset: 0;
         margin: auto;
         background: #232f3e;
         border: 2px solid #ff9900;
         padding: 20px;
         border-radius: 8px;
         z-index: 10000;
         font-family: Arial, sans-serif;
         font-size: 13px;
         color: #fff;
         width: 400px;
         height: fit-content;
         box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        `;
        breakdown.textContent = 'Loading breakdown...';

        // Position it near the bin tracker box
        const binBox = document.getElementById('bin-tracker-box');
        if (binBox) {
            const rect = binBox.getBoundingClientRect();
            breakdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
            breakdown.style.left = `${rect.left + window.scrollX}px`;
        }

        document.body.appendChild(breakdown);

        const speedCounts = await getPartsBySpeed(binLocation);

        if (speedCounts) {
            breakdown.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #ff9900; padding-bottom: 10px;">
                    <div style="font-weight: bold; color: #ff9900; font-size: 16px;">
                        📦 Bin Speed Breakdown
                    </div>
                    <button id="close-breakdown"
                        style="background: #ff9900; border: none; color: #000; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ✕
                    </button>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="color: #aaa; font-size: 11px;">BIN LOCATION</div>
                    <div style="color: #fff; font-size: 14px; font-weight: bold;">
                        ${binLocation.full}
                    </div>
                </div>

                <div style="background: #1a252f; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #ff9900; margin-bottom: 10px; font-size: 14px;">
                        🔌 Speed Breakdown
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>400G: <span style="color: #ff9900; font-weight: bold;">${speedCounts['400G']}</span></div>
                        <div>100G: <span style="color: #ff9900; font-weight: bold;">${speedCounts['100G']}</span></div>
                        <div>10G: <span style="color: #ff9900; font-weight: bold;">${speedCounts['10G']}</span></div>
                    </div>

                    <div style="margin-top: 8px; color: #aaa;">
                        Other: ${speedCounts['Other']}
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <a href="https://${PAGE_LOCATION}/part/search?search_type=all&search_string=site:${binLocation.site}%20AND%20room:${binLocation.room}%20AND%20bin:${binLocation.bin}&max_rows=50&query=GO"
                    target="_blank"
                    style="flex: 1; background: #ff9900; color: #000; text-decoration: none; padding: 10px; border-radius: 4px; text-align: center; font-weight: bold;">
                        🔍 View in Mobility
                    </a>

                    <a href="https://t.corp.amazon.com/create/templates/294727e0-09e8-4189-ad5f-3ddd066b74dc"
                    target="_blank"
                    style="flex: 1; background: #146eb4; color: #fff; text-decoration: none; padding: 10px; border-radius: 4px; text-align: center; font-weight: bold;">
                        📋 Create Ticket
                    </a>
                </div>

                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #444; text-align: center; color: #aaa; font-size: 10px;">
                    Last Updated: ${new Date().toLocaleString()}
                </div>
            `;
        } else {
            breakdown.textContent = 'Error loading breakdown';
        }

        // Close when clicking outside
        setTimeout(() => {
            document.getElementById('close-breakdown')
                .addEventListener('click', () => {
                    breakdown.remove();
                });
        }, 100);
    }


    const createElement = () => {
        const li = document.createElement('li');
        const div = document.createElement('div');
        div.setAttribute('id','bin-tracker-box');

        div.style.cssText = `
            padding: 0.7rem;
            font-weight: bold;
            font-family: Arial, sans-serif;
            display: block;
            cursor: pointer;
            margin-top: 5px;
            border-radius: 4px;
            border: 1px solid #ff9900;
            transition: all 0.3s ease;
            background: #787272;
        `;

        div.addEventListener('mouseenter', () => {
            div.style.transform = 'scale(1.02)';
            div.style.boxShadow = '0 2px 8px rgba(255, 153, 0, 0.3)';
        });

        div.addEventListener('mouseleave', () => {
            div.style.transform = 'scale(1)';
            div.style.boxShadow = 'none';
        });

        div.textContent = 'Enter Info';

        div.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A' ||
                e.target.closest('a') ||
                e.target.id === 'parts-count-click' ||
                e.target.closest('#parts-count-click')) {
            return;
            }

            const userInput = prompt('BIN NAME (format: SITE.ROOM.BIN):');
            if (userInput !== null && userInput.trim() !== '') {

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

                    div.innerHTML = '<div style="color: #ff9900;">Loading...</div>';
                    div.style.backgroundColor = '#4a4a4a';

                    const count = await getPartsCount(binLocation);
                    updateDisplay(binLocation, count);
                } else {
                    alert('Invalid format! Please use SITE.ROOM.BIN format');
                }
            }
        });

        li.append(div);

        const searchBox = document.querySelector('.navbar-search-box');
        if (searchBox && searchBox.parentNode) {
            searchBox.parentNode.insertBefore(li, searchBox);
        }
    };

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
       localStorage.removeItem('savedBin');
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
