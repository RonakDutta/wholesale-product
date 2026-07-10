import { useState } from "react";
import { Search, Send, Paperclip, MoreVertical, Building2 } from "lucide-react";

const mockChats = [
	{
		id: 1,
		sender: "Rajesh Kumar",
		company: "PackRight India",
		lastMessage: "What is the best price for 5000 units?",
		time: "10:24 AM",
		unread: 2,
		active: true,
	},
	{
		id: 2,
		sender: "Amit Singh",
		company: "LogiPal Solutions",
		lastMessage: "The payment has been processed.",
		time: "Yesterday",
		unread: 0,
		active: false,
	},
	{
		id: 3,
		sender: "Priya Sharma",
		company: "Global Exports Ltd.",
		lastMessage: "Can you arrange expedited shipping to Delhi?",
		time: "Tuesday",
		unread: 0,
		active: false,
	},
];

const mockConversation = [
	{
		id: 1,
		type: "received",
		text: "Hello! I am interested in your Premium Industrial Packaging Cartons.",
		time: "10:15 AM",
	},
	{
		id: 2,
		type: "received",
		text: "What is the best price for 5000 units?",
		time: "10:24 AM",
	},
];

const Messages = () => {
	const [messageInput, setMessageInput] = useState("");

	return (
		<div className="h-[calc(100vh-8rem)] max-w-6xl mx-auto flex flex-col lg:flex-row bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
			{/* Sidebar: Chat List */}
			<div className="w-full lg:w-80 border-r border-slate-200 flex flex-col shrink-0">
				<div className="p-4 border-b border-slate-100">
					<h2 className="text-xl font-black text-espresso mb-4">Messages</h2>
					<div className="relative">
						<Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							type="text"
							placeholder="Search conversations..."
							className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-clay focus:ring-1 focus:ring-clay outline-none transition-all"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto">
					{mockChats.map((chat) => (
						<div
							key={chat.id}
							className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${
								chat.active
									? "bg-clay/5 border-l-2 border-l-clay"
									: "hover:bg-slate-50 border-l-2 border-l-transparent"
							}`}
						>
							<div className="flex justify-between items-start mb-1">
								<h3 className="font-bold text-sm text-espresso truncate">
									{chat.sender}
								</h3>
								<span
									className={`text-[10px] font-semibold ${chat.unread ? "text-clay" : "text-slate-400"}`}
								>
									{chat.time}
								</span>
							</div>
							<div className="flex items-center gap-1.5 mb-2">
								<Building2 className="w-3 h-3 text-slate-400" />
								<span className="text-xs font-semibold text-slate-500">
									{chat.company}
								</span>
							</div>
							<div className="flex justify-between items-center">
								<p
									className={`text-xs truncate max-w-50 ${chat.unread ? "font-bold text-slate-800" : "text-slate-500"}`}
								>
									{chat.lastMessage}
								</p>
								{chat.unread > 0 && (
									<span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shrink-0">
										{chat.unread}
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
				{/* Chat Header */}
				<div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
							RK
						</div>
						<div>
							<h3 className="font-black text-espresso text-base">
								Rajesh Kumar
							</h3>
							<p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
								<Building2 className="w-3 h-3" /> PackRight India
							</p>
						</div>
					</div>
					<button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
						<MoreVertical className="w-5 h-5" />
					</button>
				</div>

				{/* Chat History */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
					<div className="text-center my-2">
						<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
							Today, Oct 24
						</span>
					</div>

					{mockConversation.map((msg) => (
						<div
							key={msg.id}
							className={`flex ${msg.type === "sent" ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[75%] rounded-2xl px-4 py-3 ${
									msg.type === "sent"
										? "bg-clay text-white rounded-br-none shadow-sm"
										: "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
								}`}
							>
								<p className="text-sm">{msg.text}</p>
								<p
									className={`text-[10px] mt-1.5 text-right font-medium ${msg.type === "sent" ? "text-white/70" : "text-slate-400"}`}
								>
									{msg.time}
								</p>
							</div>
						</div>
					))}
				</div>

				{/* Input Area */}
				<div className="p-4 bg-white border-t border-slate-200 shrink-0">
					<div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-clay focus-within:ring-1 focus-within:ring-clay transition-all">
						<button className="p-2.5 text-slate-400 hover:text-clay hover:bg-white rounded-lg transition-colors shrink-0 cursor-pointer">
							<Paperclip className="w-5 h-5" />
						</button>
						<textarea
							rows="1"
							placeholder="Type your message..."
							value={messageInput}
							onChange={(e) => setMessageInput(e.target.value)}
							className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 resize-none text-sm text-slate-900 py-2.5 px-2 outline-none"
						/>
						<button className="p-2.5 bg-clay text-white hover:bg-espresso rounded-lg transition-colors shrink-0 cursor-pointer shadow-sm">
							<Send className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Messages;
