import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import {Bar} from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const BarChart = (props) => {
    const {datasets, labels} = props;
    const data = {
        labels,
        datasets
    }
    return <Bar
    className='d-flex grow flex-grow'
        options={{
            maintainAspectRatio: true,
        }}
        data={data}
        {...props}
        style={{
            backgroundColor: 'inherit',
            // maxHeight: "50vh",
            // height:"35vh",
            ...props.style
        }}
    />

}

export default BarChart;