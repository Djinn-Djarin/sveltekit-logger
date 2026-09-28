import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	const data = await request.json();
	console.log("Server received message:", data.message);
	
	// Let's do a server-side fetch to demonstrate that feature as well
	await fetch('https://dummyjson.com/products/1');

	return json({ success: true, reply: "Message received on the server!" });
}
