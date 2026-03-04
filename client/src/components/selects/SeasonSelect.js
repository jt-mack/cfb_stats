import FloatingLabel from 'react-bootstrap/FloatingLabel';
import Form from 'react-bootstrap/Form';

function YearSelect(props) {
    const { handleChange, value } = props;
    const today = new Date();
    const currentYear = today.getFullYear();
    const minYear = currentYear - 10;
    const years = [];
    for (let i = currentYear; i >= minYear; i--) {
        years.push(i);
    };
    return (
        <FloatingLabel controlId="floatingSelect" label="Season">
            <Form.Select aria-label="Select Season" value={value} onChange={handleChange}>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </Form.Select>
        </FloatingLabel>
    );
}

export default YearSelect;