import React from 'react';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Filler,
	Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Filler,
	Legend
);

const LineChart = ({ data }) => {
	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				mode: 'index',
				intersect: false,
				backgroundColor: '#162235',
				titleColor: '#94A3B8',
				bodyColor: '#FFFFFF',
				borderColor: 'rgba(255, 255, 255, 0.1)',
				borderWidth: 1,
				padding: 12,
				cornerRadius: 12,
				callbacks: {
					label: function (context) {
						let label = context.dataset.label || '';
						if (label) {
							label += ': ';
						}
						if (context.parsed.y !== null) {
							label += new Intl.NumberFormat('vi-VN').format(context.parsed.y) + ' đ';
						}
						return label;
					}
				}
			},
		},
		scales: {
			x: {
				grid: {
					display: false,
				},
				ticks: {
					color: '#64748b',
					font: {
						size: 10,
						weight: 'bold'
					},
					maxRotation: 0,
					autoSkip: true,
					maxTicksLimit: 5
				},
			},
			y: {
				grid: {
					color: 'rgba(255, 255, 255, 0.05)',
				},
				ticks: {
					color: '#64748b',
					font: {
						size: 10,
					},
					beginAtZero: false,
					callback: function (value) {
						return value >= 1000 ? (value / 1000).toLocaleString('vi-VN') + 'k' : value;
					}
				},
			},
		},
	};

	// Default data if none provided
	const defaultData = {
		labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
		datasets: [
			{
				fill: true,
				label: 'Giá',
				data: [0, 0, 0, 0, 0, 0],
				borderColor: '#3B82F6',
				backgroundColor: 'rgba(59, 130, 246, 0.1)',
				tension: 0.4,
				pointRadius: 4,
				pointHoverRadius: 6,
				borderWidth: 3,
			},
		],
	};

	return <Line options={options} data={data || defaultData} />;
};

export default LineChart;
