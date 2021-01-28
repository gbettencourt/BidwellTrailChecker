import React, { Component } from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import BikeIcon from '@material-ui/icons/DirectionsBike';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Link from '@material-ui/core/Link';
import { Captcha } from '../components/Captcha';
import { getRandomInt } from '../util/Util';

const styles = (theme) => ({
	paper: {
		marginTop: theme.spacing(8),
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
	},
	avatar: {
		margin: theme.spacing(1),
		backgroundColor: theme.palette.secondary.main,
	},
	form: {
		width: '100%', // Fix IE 11 issue.
		marginTop: theme.spacing(3),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
	},
});

class SignUp extends Component {
	constructor(props) {
		super(props);
		this.handleRegisterClick = this.handleRegisterClick.bind(this);
		this.handleEmailChange = this.handleEmailChange.bind(this);
		this.handleCaptchaChange = this.handleCaptchaChange.bind(this);
		this.state = {
			isRegistered: false,
			isEmailValid: true,
			isCaptchaValid: true,
			email: '',
			emailHelperText: '',
			captcha: '',
			captchaHelperText: '',
			captchaCode: getRandomInt(1000, 9999),
			regError: '',
			trailStatus: '',
			lastCheckTime: '',
		};
	}

	componentDidMount() {
		fetch('/api/trailstatus')
			.then((res) => res.json())
			.then((status) =>
				this.setState({
					trailStatus: status.trailStatus,
					lastCheckTime: status.lastCheck,
				})
			);
	}

	handleRegisterClick() {
		const isValidEmail = document.getElementById('email').validity.valid;
		if (!isValidEmail) {
			this.setState({
				isEmailValid: false,
				emailHelperText: 'Please enter a valid email',
			});
		}
		const isValidCaptcha = this.verifyCaptcha(
			document.getElementById('captcha').value
		);
		if (!isValidCaptcha) {
			this.setState({
				isCaptchaValid: false,
				captchaHelperText: 'Please enter the number below',
			});
		}
		if (!isValidEmail || !isValidCaptcha) {
			return;
		}
		const postData = { email: this.state.email };
		fetch('/api/registeremail', {
			method: 'post',
			body: JSON.stringify(postData),
			headers: { 'Content-Type': 'application/json' },
		})
			.then((res) => res.json())
			.then((result) => {
				if (result.success) {
					this.setState({ isRegistered: true });
				} else {
					this.setState({ regError: result.error });
				}
			});
	}

	handleEmailChange(event) {
		this.setState({ email: event.target.value });
	}

	handleCaptchaChange(event) {
		const value = event.target.value;
		const isValid = this.verifyCaptcha(value);
		this.setState({ captcha: value, isCaptchaValid: isValid });
	}

	verifyCaptcha(value) {
		return (
			value && value !== '' && parseInt(value) === this.state.captchaCode
		);
	}

	render() {
		const { classes } = this.props;
		const isRegistered = this.state.isRegistered;
		const regError = this.state.regError;
		const trailStatusStyle = {
			color: this.state.trailStatus === 'Open' ? 'green' : 'red',
		};

		return (
			<Container component="main" maxWidth="xs">
				<CssBaseline />
				<div className={classes.paper}>
					<Avatar className={classes.avatar}>
						<BikeIcon />
					</Avatar>
					{regError && (
						<Typography component="h1" variant="h5">
							Unable to register {regError}
						</Typography>
					)}
					{isRegistered ? (
						<Typography component="h1" variant="h5">
							Your registration was successful!
						</Typography>
					) : (
						<div>
							<Box mt={2}></Box>
							<Typography component="h1" variant="h5">
								Current trail status:{' '}
								<span style={trailStatusStyle}>
									{this.state.trailStatus}
								</span>
							</Typography>
							<Typography component="h8" variant="h8">
								Last checked:{' '}
								<span>
									{new Date(
										this.state.lastCheckTime
									).toLocaleString()}
								</span>
							</Typography>
							<Box mt={5}></Box>
							<Typography component="h1" variant="h5">
								Enter your email address to get notifications
								when the Upper Bidwell Park trail status
								changes:
							</Typography>
							<form className={classes.form} noValidate>
								<Grid container spacing={2}>
									<Grid item xs={12}>
										<TextField
											variant="outlined"
											required
											fullWidth
											id="email"
											type="email"
											label="Email Address"
											name="email"
											autoComplete="email"
											value={this.state.email}
											helperText={
												this.state.emailHelperText
											}
											error={!this.state.isEmailValid}
											onChange={this.handleEmailChange}
										/>
									</Grid>
								</Grid>
								<Grid container spacing={2}>
									<Grid item xs={12}>
										<TextField
											variant="outlined"
											required
											fullWidth
											id="captcha"
											label="Enter Code Below"
											name="captcha"
											value={this.state.captcha}
											helperText={
												this.state.captchaHelperText
											}
											error={!this.state.isCaptchaValid}
											onChange={this.handleCaptchaChange}
										/>
									</Grid>
									<Grid item xs={12}>
										<Captcha
											chars={this.state.captchaCode.toString()}
										/>
									</Grid>
								</Grid>
								<Button
									fullWidth
									variant="contained"
									color="primary"
									className={classes.submit}
									onClick={this.handleRegisterClick}
								>
									Sign Up
								</Button>
							</form>
						</div>
					)}
				</div>
				<Box mt={2}></Box>
				<Box>
					<Link href="Unsubscribe">Unsubscribe</Link>
				</Box>
				<Box>
					<Link href="https://www.chico.ca.us/park-trails">
						Park Trail Page
					</Link>
				</Box>
			</Container>
		);
	}
}
export default withStyles(styles)(SignUp);
