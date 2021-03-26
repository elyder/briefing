import { useState } from 'react';
import useSWR from 'swr';
import { DOMParser, ApplyTemplate, ValueOf, xpath } from 'react-xslt';

const fetcher = (url) => {
	return fetch(url)
		.then(response => response.text())
		.then(response => new DOMParser().parseFromString(response, 'text/xml'));
}

const url = (icao) => `https://api.met.no/weatherapi/tafmetar/1.0/tafmetar.xml?icao=${icao}`;

const MetData = ({ icao }) => {
	const { data, error } = useSWR(
		url(icao),
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			refreshWhenOffline: false,
			refreshWhenHidden: false,
			refreshInterval: 0,
			compare: (foo, bar) => foo === bar
		},
	);

	if (error) {
		console.log(error, data);
		return <div>
			<span>failed to load</span>
		</div>
	}

	if (!data)
		return <div>loading...</div>

//	console.log(data);
	const icaos = icao
		.split(',')
		.map((code) => {
			const taf = xpath(data, `//metno:terminalAerodromeForecast[metno:icaoAirportIdentifier='${code}']`)
				.map(xml => {
					const time = ValueOf({ xml, select: "metno:issuedTime/gml:TimeInstant/gml:timePosition" });
					const tafText = ValueOf({ xml, select: "metno:tafText" }).trim();

					return {
						time,
						tafText,
					}
				})
				.sort((first, second) => (new Date(second.time)) - (new Date(first.time)))

			const metar = xpath(data, `//metno:meteorologicalAerodromeReport[metno:icaoAirportIdentifier='${code}']`)
				.map(xml => {
					const time = ValueOf({ xml, select: "metno:validTime/gml:TimeInstant/gml:timePosition" });
					const metarText = ValueOf({ xml, select: "metno:metarText" }).trim();

					return {
						time,
						metarText,
					}
					return {}
				})
				.sort((first, second) => (new Date(second.time)) - (new Date(first.time)))



			return {
				code,
				taf: [ taf[0] ],
				metar: [ metar[0] ],
			};
		});

	return <div>
		{
			icaos.map(({ code, taf, metar }) =>
				<div key={code}>
					<h2>{code}</h2>
					{
						metar.map(({ time, metarText }) => <div key={metarText}>
							<pre style={{ display: 'inline-block' }}>METAR {metarText}</pre>
						</div>)
					}
					{
						taf.map(({ time, tafText }) => <div key={tafText}>
							<pre style={{ display: 'inline-block' }}>TAF {tafText}</pre>
						</div>)
					}
				</div>
			)
		}
	</div>
}

export default function Home() {
	const [ icao, setIcao ] = useState('ENZV,ENHD,ENSO,ENBR');
  return <div>
		<h1> METAR / TAF </h1>
		<input type="text" style={{ padding: '10px', width: '200px' }} value={icao} onChange={e => setIcao(e.target.value)} />
		{ icao !== '' &&
			<MetData icao={icao} />
		}
	</div>;
}
